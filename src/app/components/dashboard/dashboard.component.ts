import {ChangeDetectorRef, Component, OnChanges, OnDestroy, OnInit,} from '@angular/core';
import {EventService} from '../../services/app.event.service';
import {combineLatest, of, Subscription} from 'rxjs';
import {EventInterface} from 'quantified-self-lib/lib/events/event.interface';
import {Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {AppAuthService} from '../../authentication/app.auth.service';
import {User} from 'quantified-self-lib/lib/users/user';
import {DateRanges} from 'quantified-self-lib/lib/users/user.dashboard.settings.interface';
import {getDatesForDateRange} from '../event-search/event-search.component';
import {UserService} from '../../services/app.user.service';
import {DaysOfTheWeek} from 'quantified-self-lib/lib/users/user.unit.settings.interface';
import {ActionButtonService} from '../../services/action-buttons/app.action-button.service';
import {ActionButton} from '../../services/action-buttons/app.action-button';
import {map, mergeMap, switchMap} from 'rxjs/operators';
import WhereFilterOp = firebase.firestore.WhereFilterOp;
import {MatDialog} from '@angular/material/dialog';
import {EventsExportFormComponent} from '../events-export-form/events-export.form.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})

export class DashboardComponent implements OnInit, OnDestroy, OnChanges {
  public user: User;
  public events: EventInterface[];
  public dataSubscription: Subscription;
  public searchTerm: string;
  public searchStartDate: Date;
  public searchEndDate: Date;
  public startOfTheWeek: DaysOfTheWeek;
  public showUpload: boolean = this.authService.isCurrentUserAnonymous();

  private shouldSearch: boolean;

  constructor(private router: Router,
              public authService: AppAuthService,
              private eventService: EventService,
              private userService: UserService,
              private actionButtonService: ActionButtonService,
              private  changeDetector: ChangeDetectorRef,
              private dialog: MatDialog,
              private snackBar: MatSnackBar) {
    this.addUploadButton();
  }

  async ngOnInit() {
    this.shouldSearch = true;
    this.dataSubscription = this.authService.user.pipe(switchMap((user) => {
      // Get the user
      if (!user) {
        this.router.navigate(['home']).then(() => {
          this.snackBar.open('Logged out')
        });
        return of({user: null, events: null});
      }

      if (this.user && (
        this.user.settings.dashboardSettings.dateRange !== user.settings.dashboardSettings.dateRange
        || this.user.settings.dashboardSettings.startDate !== user.settings.dashboardSettings.startDate
        || this.user.settings.dashboardSettings.endDate !== user.settings.dashboardSettings.endDate
        || this.user.settings.unitSettings.startOfTheWeek !== user.settings.unitSettings.startOfTheWeek
      )) {
        this.events = null;
        this.shouldSearch = true;
      }

      // this.user = user;
      // Setup the ranges to search depending on pref
      if (user.settings.dashboardSettings.dateRange === DateRanges.custom && user.settings.dashboardSettings.startDate && user.settings.dashboardSettings.endDate) {
        this.searchStartDate = new Date(user.settings.dashboardSettings.startDate);
        this.searchEndDate = new Date(user.settings.dashboardSettings.endDate);
      } else {
        this.searchStartDate = getDatesForDateRange(user.settings.dashboardSettings.dateRange, user.settings.unitSettings.startOfTheWeek).startDate;
        this.searchEndDate = getDatesForDateRange(user.settings.dashboardSettings.dateRange, user.settings.unitSettings.startOfTheWeek).endDate;
      }

      this.startOfTheWeek = user.settings.unitSettings.startOfTheWeek;

      const limit = 0; // @todo double check this how it relates
      const where = [];
      if (this.searchTerm) {
        where.push({
          fieldPath: 'name',
          opStr: <WhereFilterOp>'==',
          value: this.searchTerm
        });
      }

      if ((!this.searchStartDate || !this.searchEndDate) && user.settings.dashboardSettings.dateRange === DateRanges.custom) {
        return of({events: [], user: user})
      }
      if (user.settings.dashboardSettings.dateRange !== DateRanges.all) {
        // this.searchStartDate.setHours(0, 0, 0, 0); // @todo this should be moved to the search component
        where.push({
          fieldPath: 'startDate',
          opStr: <WhereFilterOp>'>=',
          value: this.searchStartDate.getTime() // Should remove mins from date
        });
        // this.searchEndDate.setHours(24, 0, 0, 0);
        where.push({
          fieldPath: 'startDate',
          opStr: <WhereFilterOp>'<=', // Should remove mins from date
          value: this.searchEndDate.getTime()
        });
      }

      // @todo remove this if the bug is fixed
      // If this user is not set here there is a bug (again that makes a memory leak with big data) for the table component
      // this.user = user;

      // Get what is needed
      const returnObservable = this.shouldSearch ?
        this.eventService
          .getEventsForUserBy(user, where, 'startDate', false, limit)
        : of(this.events);
      return returnObservable.pipe(map((events) => {
        return {events: events, user: user}
      }))
    })).subscribe((eventsAndUser) => {
      this.events = eventsAndUser.events;
      this.user = eventsAndUser.user;
      this.shouldSearch = false;
      if (this.events && this.events.length) {
        this.addExportButton();
      } else {
        this.removeExportButton();
      }
    });

  }

  search(search: { searchTerm: string, startDate: Date, endDate: Date, dateRange: DateRanges }) {
    this.events = null;
    this.shouldSearch = true;
    this.searchTerm = search.searchTerm;
    this.searchStartDate = search.startDate;
    this.searchEndDate = search.endDate;
    this.user.settings.dashboardSettings.dateRange = search.dateRange;
    this.user.settings.dashboardSettings.startDate = search.startDate && search.startDate.getTime();
    this.user.settings.dashboardSettings.endDate = search.endDate && search.endDate.getTime();
    this.userService.updateUserProperties(this.user, {settings: this.user.settings})
  }

  ngOnChanges() {
  }

  ngOnDestroy(): void {
    this.dataSubscription.unsubscribe();
    this.removeExportButton();
    this.removeUploadButton();
  }

  private addUploadButton() {
    this.actionButtonService.addActionButton('turnOnUpload', new ActionButton('cloud_upload', () => {
      this.showUpload = !this.showUpload;
    }));
  }

  private removeUploadButton() {
    this.actionButtonService.removeActionButton('turnOnUpload');

  }

  private addExportButton() {
    this.actionButtonService.addActionButton('export', new ActionButton('arrow_downward', () => {
      const dialogRef = this.dialog.open(EventsExportFormComponent, {
        // width: '100vw',
        disableClose: false,
        data: {
          events: this.events,
          user: this.user,
        },
      });
    }));
  }

  private removeExportButton() {
    this.actionButtonService.removeActionButton('export');
  }
}
