'use strict';

import * as functions from 'firebase-functions'
import * as admin from "firebase-admin";
import * as requestPromise from "request-promise-native";
import {getTokenData} from "./service-tokens";
import {generateIDFromParts} from "./utils";
import {isCorsAllowed, setAccessControlHeadersOnResponse} from "./auth";
import {QueueItemInterface} from "quantified-self-lib/lib/queue-item/queue-item.interface";
import {ServiceNames} from "quantified-self-lib/lib/meta-data/meta-data.interface";


/**
 * Add to the workout queue the workouts of a user for a selected date range
 */
export const addHistoryToQueue = functions.region('europe-west2').https.onRequest(async (req, res) => {
  // Directly set the CORS header
  if (!isCorsAllowed(req) || (req.method !== 'OPTIONS' && req.method !== 'POST')) {
    res.status(403);
    res.send();
    return
  }

  setAccessControlHeadersOnResponse(req, res);

  if (req.method === 'OPTIONS') {
    res.status(200);
    res.send();
    return;
  }

  if (!req.body.firebaseAuthToken || !req.body.startDate || !req.body.endDate) {
    console.error(`No params provided. This call needs: 'firebaseAuthToken', 'startDate' and 'endDate'`);
    res.status(500);
    res.send();
    return
  }

  const startDate = new Date(req.body.startDate);
  const endDate = new Date(req.body.endDate);

  let decodedIdToken;
  try {
    decodedIdToken = await admin.auth().verifyIdToken(req.body.firebaseAuthToken);
  } catch (e) {
    console.error(e);
    console.error(`Could not verify user token aborting operation`);
    res.status(500);
    res.send();
    return;
  }

  if (!decodedIdToken) {
    console.error(`Could not verify and decode token`);
    res.status(500);
    res.send();
    return;
  }

  // First check last history import
  // const userMetaDocumentSnapshot = await admin.firestore().collection('users').doc(decodedIdToken.uid).collection('meta').doc(ServiceNames.SuuntoApp).get()
  // if ((new Date(userMetaDocumentSnapshot.data()!.didLastHistoryImport)) < )

  // @todo BLOCK SEE above


  const tokenQuerySnapshots = await admin.firestore().collection('suuntoAppAccessTokens').doc(decodedIdToken.uid).collection('tokens').get();

  console.log(`Found ${tokenQuerySnapshots.size} tokens for user ${decodedIdToken.uid}`);

  // Get the history for those tokens
  for (const tokenQueryDocumentSnapshot of tokenQuerySnapshots.docs) {

    const serviceToken = await getTokenData(tokenQueryDocumentSnapshot, false);

    let result: any;
    try {
      result = await requestPromise.get({
        headers: {
          'Authorization': serviceToken.accessToken,
          'Ocp-Apim-Subscription-Key': functions.config().suuntoapp.subscription_key,
          json: true,
        },
        url: `https://cloudapi.suunto.com/v2/workouts?since=${startDate.getTime()}&until=${endDate.getTime()}&limit=1000000`,
      });
      result = JSON.parse(result);
      // console.log(`Deauthorized token ${doc.id} for ${decodedIdToken.uid}`)
    } catch (e) {
      console.error(`Could not get history for token ${tokenQueryDocumentSnapshot.id} for user ${decodedIdToken.uid}`, e);
      res.status(500);
      res.send({result: 'Could not get history'});
      continue;
    }

    if (result.error !== null) {
      console.error(`Could not get history for token ${tokenQueryDocumentSnapshot.id} for user ${decodedIdToken.uid} due to service error`, result.error);
      continue;
    }

    if (result.metadata.workoutcount === 0) {
      console.log(`No workouts to add to history for token ${tokenQueryDocumentSnapshot.id} for user ${decodedIdToken.uid}`);
      continue;
    }

    console.log(`Found ${result.metadata.workoutcount} workouts for the dates of ${startDate} to ${endDate} for token ${tokenQueryDocumentSnapshot.id} for user ${decodedIdToken.uid}`);

    const batchCount = Math.ceil(result.metadata.workoutcount / 500);
    const batchesToProcess: any[] = [];
    (Array(batchCount)).fill(null).forEach((justNull, index) => {
      const start = index * 500;
      const end = (index + 1) * 500;
      batchesToProcess.push(result.payload.slice(start, end))
    });

    try {
      await admin.firestore().collection('users').doc(decodedIdToken.uid).collection('meta').doc(ServiceNames.SuuntoApp).set({
        didLastHistoryImport: (new Date()).toJSON(),
        lastHistoryImportWorkoutBatchCount: batchCount
      });
    }catch (e) {
      console.error(`Could not write data to firestore`, e);
      continue;
    }

    console.log(`Created ${batchCount} batches for token ${tokenQueryDocumentSnapshot.id} for user ${decodedIdToken.uid}`);
    let processedBatchesCount = 0;
    for (const batchToProcess of batchesToProcess) {
      const batch = admin.firestore().batch();
      for (const payload of batchToProcess) {
        // Maybe do a get or insert it at another queue
        batch.set(admin.firestore().collection('suuntoAppWorkoutQueue').doc(generateIDFromParts([serviceToken.userName, payload.workoutKey])), <QueueItemInterface>{
          userName: serviceToken.userName,
          workoutID: payload.workoutKey,
          retryCount: 0, // So it can be re-processed
          processed: false, //So it can be re-processed
        });
      }
      // Try to commit it
      try {
        await batch.commit();
        console.log(`Batch #${processedBatchesCount + 1} saved for token ${tokenQueryDocumentSnapshot.id} and user ${decodedIdToken.uid} `);
        processedBatchesCount++;
      } catch (e) {
        console.error(`Could not save batch ${processedBatchesCount} for token ${tokenQueryDocumentSnapshot.id} and user ${decodedIdToken.uid} due to service error aborting`, result.error);
        // @todo resolve somehow
        continue; // Unnecessary but clear to the user that it will continue
      }
    }
    console.log(`${processedBatchesCount} out of ${batchesToProcess.length} processed and saved for token ${tokenQueryDocumentSnapshot.id} and user ${decodedIdToken.uid} `);

  }

  res.status(200);
  res.send({result: 'History items added to queue'});

});
