import {EventInterface} from '../event.interface';
import {ActivityInterface} from '../../activities/activity.interface';
import {EventExporterTCX} from '../adapters/exporters/exporter.tcx';
import {PointInterface} from '../../points/point.interface';
import {Event} from '../event';
import {LapInterface} from '../../laps/lap.interface';
import {DataHeartRate} from '../../data/data.heart-rate';
import {DataCadence} from '../../data/data.cadence';
import {DataSpeed} from '../../data/data.speed';
import {DataVerticalSpeed} from '../../data/data.vertical-speed';
import {DataTemperature} from '../../data/data.temperature';
import {DataAltitude} from '../../data/data.altitude';
import {DataPower} from '../../data/data.power';
import {DataAltitudeMax} from '../../data/data.altitude-max';
import {DataAltitudeMin} from '../../data/data.altitude-min';
import {DataAltitudeAvg} from '../../data/data.altitude-avg';
import {DataHeartRateMax} from '../../data/data.heart-rate-max';
import {DataHeartRateMin} from '../../data/data.heart-rate-min';
import {DataHeartRateAvg} from '../../data/data.heart-rate-avg';
import {DataCadenceMax} from '../../data/data.cadence-max';
import {DataCadenceMin} from '../../data/data.cadence-min';
import {DataCadenceAvg} from '../../data/data.cadence-avg';
import {DataSpeedMax} from '../../data/data.speed-max';
import {DataSpeedMin} from '../../data/data.speed-min';
import {DataSpeedAvg} from '../../data/data.speed-avg';
import {DataVerticalSpeedMax} from '../../data/data.vertical-speed-max';
import {DataVerticalSpeedMin} from '../../data/data.vertical-speed-min';
import {DataVerticalSpeedAvg} from '../../data/data.vertical-speed-avg';
import {DataPowerMax} from '../../data/data.power-max';
import {DataPowerMin} from '../../data/data.power-min';
import {DataPowerAvg} from '../../data/data.power-avg';
import {DataTemperatureMax} from '../../data/data.temperature-max';
import {DataTemperatureMin} from '../../data/data.temperature-min';
import {DataTemperatureAvg} from '../../data/data.temperature-avg';
import {DataDistance} from "../../data/data.distance";
import {DataDuration} from "../../data/data.duration";
import {DataPause} from "../../data/data.pause";

export class EventUtilities {

  public static getEventAsTCXBloB(event: EventInterface): Promise<Blob> {
    return new Promise((resolve, reject) => {
      resolve(new Blob(
        [(new EventExporterTCX).getAsString(event)],
        {type: (new EventExporterTCX).getFileType()}
      ));
    });
  }

  public static getDataTypeAverage(event: EventInterface,
                                   dataType: string,
                                   startDate?: Date,
                                   endDate?: Date,
                                   activities?: ActivityInterface[]): number {
    let count = 0;
    const averageForDataType = event.getPoints(startDate, endDate, activities).reduce((average: number, point: PointInterface) => {
      if (!point.getDataByType(dataType)) {
        return average;
      }
      average += point.getDataByType(dataType).getValue();
      count++;
      return average;
    }, 0);
    return count ? (averageForDataType / count) : null;
  }

  public static getDateTypeMaximum(event: EventInterface,
                                   dataType: string,
                                   startDate?: Date,
                                   endDate?: Date,
                                   activities?: ActivityInterface[]): number {

    const dataValuesArray = event.getPoints(startDate, endDate, activities).reduce((dataValues, point: PointInterface) => {
      if (point.getDataByType(dataType)) {
        dataValues.push(point.getDataByType(dataType).getValue());
      }
      return dataValues;
    }, []);
    return dataValuesArray.length ? Math.max(...dataValuesArray) : null;
  }

  public static getDateTypeMinimum(event: EventInterface,
                                   dataType: string,
                                   startDate?: Date,
                                   endDate?: Date,
                                   activities?: ActivityInterface[]): number {

    const dataValuesArray = event.getPoints(startDate, endDate, activities).reduce((dataValues, point: PointInterface) => {
      if (point.getDataByType(dataType)) {
        dataValues.push(point.getDataByType(dataType).getValue());
      }
      return dataValues;
    }, []);
    return dataValuesArray.length ? Math.min(...dataValuesArray) : null;
  }

  public static mergeEvents(events: EventInterface[]): Promise<EventInterface> {
    return new Promise((resolve, reject) => {
      // First sort the events by first point date
      events.sort((eventA: EventInterface, eventB: EventInterface) => {
        return +eventA.getFirstActivity().startDate - +eventB.getFirstActivity().startDate;
      });
      const mergeEvent = new Event();
      for (const event of events) {
        for (const activity of event.getActivities()) {
          mergeEvent.addActivity(activity);
          mergeEvent.setDistance(new DataDistance(mergeEvent.getDistance().getValue() + activity.getDistance().getValue()));
          mergeEvent.setDuration(new DataDuration(mergeEvent.getDuration().getValue() + activity.getDuration().getValue()));
          mergeEvent.setPause(new DataPause(mergeEvent.getPause().getValue() + activity.getPause().getValue()));
          // @todo merge the rest of the stats
        }
      }

      mergeEvent.name = 'Merged at ' + (new Date()).toISOString();
      return resolve(mergeEvent);
    });
  }

  public static generateStats(event: EventInterface) {
    // Todo should also work for event
    event.getActivities().map((activity: ActivityInterface) => {
      this.generateStatsForActivityOrLap(event, activity);
      activity.getLaps().map((lap: LapInterface) => {
        this.generateStatsForActivityOrLap(event, lap);
      })
    })
  }

  private static generateStatsForActivityOrLap(event: EventInterface, subject: ActivityInterface | LapInterface) {
    // Altitude
    if (subject.getStat(DataAltitudeMax.className) === undefined) {
      subject.addStat(new DataAltitudeMax(this.getDateTypeMaximum(event, DataAltitude.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataAltitudeMin.className) === undefined) {
      subject.addStat(new DataAltitudeMin(this.getDateTypeMinimum(event, DataAltitude.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataAltitudeAvg.className) === undefined) {
      subject.addStat(new DataAltitudeAvg(this.getDataTypeAverage(event, DataAltitude.type, subject.startDate, subject.endDate)));
    }

    // Heart Rate
    if (subject.getStat(DataHeartRateMax.className) === undefined) {
      subject.addStat(new DataHeartRateMax(this.getDateTypeMaximum(event, DataHeartRate.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataHeartRateMin.className) === undefined) {
      subject.addStat(new DataHeartRateMin(this.getDateTypeMinimum(event, DataHeartRate.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataHeartRateAvg.className) === undefined) {
      subject.addStat(new DataHeartRateAvg(this.getDataTypeAverage(event, DataHeartRate.type, subject.startDate, subject.endDate)));
    }

    // Cadence
    if (subject.getStat(DataCadenceMax.className) === undefined) {
      subject.addStat(new DataCadenceMax(this.getDateTypeMaximum(event, DataCadence.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataCadenceMin.className) === undefined) {
      subject.addStat(new DataCadenceMin(this.getDateTypeMinimum(event, DataCadence.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataCadenceAvg.className) === undefined) {
      subject.addStat(new DataCadenceAvg(this.getDataTypeAverage(event, DataCadence.type, subject.startDate, subject.endDate)));
    }

    // Speed
    if (subject.getStat(DataSpeedMax.className) === undefined) {
      subject.addStat(new DataSpeedMax(this.getDateTypeMaximum(event, DataSpeed.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataSpeedMin.className) === undefined) {
      subject.addStat(new DataSpeedMin(this.getDateTypeMinimum(event, DataSpeed.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataSpeedAvg.className) === undefined) {
      subject.addStat(new DataSpeedAvg(this.getDataTypeAverage(event, DataSpeed.type, subject.startDate, subject.endDate)));
    }

    // Vertical Speed
    if (subject.getStat(DataVerticalSpeedMax.className) === undefined) {
      subject.addStat(new DataVerticalSpeedMax(this.getDateTypeMaximum(event, DataVerticalSpeed.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataVerticalSpeedMin.className) === undefined) {
      subject.addStat(new DataVerticalSpeedMin(this.getDateTypeMinimum(event, DataVerticalSpeed.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataVerticalSpeedAvg.className) === undefined) {
      subject.addStat(new DataVerticalSpeedAvg(this.getDataTypeAverage(event, DataVerticalSpeed.type, subject.startDate, subject.endDate)));
    }

    // Power
    if (subject.getStat(DataPowerMax.className) === undefined) {
      subject.addStat(new DataPowerMax(this.getDateTypeMaximum(event, DataPower.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataPowerMin.className) === undefined) {
      subject.addStat(new DataPowerMin(this.getDateTypeMinimum(event, DataPower.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataPowerAvg.className) === undefined) {
      subject.addStat(new DataPowerAvg(this.getDataTypeAverage(event, DataPower.type, subject.startDate, subject.endDate)));
    }

    // Temperature
    if (subject.getStat(DataTemperatureMax.className) === undefined) {
      subject.addStat(new DataTemperatureMax(this.getDateTypeMaximum(event, DataTemperature.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataTemperatureMin.className) === undefined) {
      subject.addStat(new DataTemperatureMin(this.getDateTypeMinimum(event, DataTemperature.type, subject.startDate, subject.endDate)));
    }
    if (subject.getStat(DataTemperatureAvg.className) === undefined) {
      subject.addStat(new DataTemperatureAvg(this.getDataTypeAverage(event, DataTemperature.type, subject.startDate, subject.endDate)));
    }
  }

  // public static getEventDataTypeGain(event: EventInterface,
  //                                    dataType: string,
  //                                    startDate?: Date,
  //                                    endDate?: Date,
  //                                    activities?: ActivityInterface[],
  //                                    precision?: number,
  //                                    minDiff?: number): number {
  //   precision = precision || 1;
  //   minDiff = minDiff || 1.5;
  //   let gain = 0;
  //   event.getPoints(startDate, endDate, activities).reduce((previous: PointInterface, next: PointInterface) => {
  //     if (!previous.getDataByType(dataType)) {
  //       return next;
  //     }
  //     if (!next.getDataByType(dataType)) {
  //       return previous;
  //     }
  //     if ((previous.getDataByType(dataType).getValue() + minDiff) < (Number(next.getDataByType(dataType).getValue()))) {
  //       gain += Number(next.getDataByType(dataType).getValue().toFixed(precision)) - Number(previous.getDataByType(dataType).getValue().toFixed(precision));
  //     }
  //     return next;
  //   });
  //   return gain;
  // }
  //
  // public static getEventDataTypeLoss(event: EventInterface,
  //                                    dataType: string,
  //                                    startDate?: Date,
  //                                    endDate?: Date,
  //                                    activities?: ActivityInterface[],
  //                                    precision?: number,
  //                                    minDiff?: number): number {
  //   precision = precision || 1;
  //   minDiff = minDiff || 1.5;
  //   let loss = 0;
  //   event.getPoints(startDate, endDate, activities).reduce((previous: PointInterface, next: PointInterface) => {
  //     if (!previous.getDataByType(dataType)) {
  //       return next;
  //     }
  //     if (!next.getDataByType(dataType)) {
  //       return previous;
  //     }
  //     if ((Number(next.getDataByType(dataType).getValue().toFixed(precision)) - minDiff) < Number(previous.getDataByType(dataType).getValue().toFixed(precision))) {
  //       loss += Number(previous.getDataByType(dataType).getValue().toFixed(precision)) - Number(next.getDataByType(dataType).getValue().toFixed(precision));
  //     }
  //     return next;
  //   });
  //   return loss;
  // }

  // private static geodesyAdapter = new GeoLibAdapter();
  //
  // public static getEventDistanceInMeters(event: EventInterface,
  //                                        startDate?: Date,
  //                                        endDate?: Date,
  //                                        activities?: ActivityInterface[]): number {
  //   if (!event.hasPointsWithPosition()) {
  //     return 0;
  //   }
  //   return event.getActivities().reduce((distance: number, activity: ActivityInterface) => {
  //     return distance + this.geodesyAdapter.getDistance(event.getPointsWithPosition(void 0, void 0, [activity]));
  //   }, 0);
  // }


}


// public createEventFromJSONSMLString(data: string): Promise<EventInterface> {
//   return new Promise((resolve, reject) => {
//     return resolve(EventImporterSML.getFromJSONString(data));
//   });
// }


// public createEventFromJSONFITString(data: string): Promise<EventInterface> {
//   return new Promise((resolve, reject) => {
//     return resolve(EventImporterFIT.getFromJSONString(data));
//   });
// }



