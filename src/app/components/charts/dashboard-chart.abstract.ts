import {ChartAbstract} from './chart.abstract';
import {Input, OnChanges} from '@angular/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import {SummariesChartDataDateRages, SummariesChartDataInterface} from '../summaries/summaries.component';
import {
  ChartDataCategoryTypes,
  ChartDataValueTypes
} from 'quantified-self-lib/lib/users/user.dashboard.chart.settings.interface';


export abstract class DashboardChartAbstract extends ChartAbstract implements OnChanges {
  @Input() data: any;


  @Input() chartDataType: string;
  @Input() chartDataValueType: ChartDataValueTypes;
  @Input() chartDataCategoryType: ChartDataCategoryTypes;
  @Input() filterLowValues: boolean;
  @Input() chartDataDateRange?: SummariesChartDataDateRages;

  ngOnChanges(simpleChanges) {
    // If theme changes destroy the chart
    if (simpleChanges.chartTheme) {
      this.destroyChart();
    }

    if (!this.data) {
      this.loading();
      return;
    }

    this.loaded();
    if (!this.data.length) {
      return;
    }

    // 1. If there is no chart create
    if (!this.chart) {
      this.chart = <am4charts.XYChart>this.createChart();
      this.chart.data = [];
    }


    if (!simpleChanges.data && !simpleChanges.chartTheme) {
      return;
    }

    // To create an animation here it has to update the values of the data items
    this.chart.data = this.generateChartData(this.data);
  }

  getCategoryAxis(): am4charts.CategoryAxis | am4charts.DateAxis {
    switch (this.chartDataCategoryType) {
      case ChartDataCategoryTypes.DateType:
        const axis = new am4charts.DateAxis();
        axis.skipEmptyPeriods = true;
        switch (this.chartDataDateRange) {
          case SummariesChartDataDateRages.Yearly:
            axis.dateFormatter.dateFormat = 'yyyy';
            axis.baseInterval = {
              'timeUnit': 'year',
              'count': 1
            };
            break;
          case SummariesChartDataDateRages.Monthly:
            axis.dateFormatter.dateFormat = 'MMM yyyy';
            axis.baseInterval = {
              'timeUnit': 'month',
              'count': 1
            };
            break;
          case SummariesChartDataDateRages.Daily:
            axis.dateFormatter.dateFormat = 'dd MMM yyyy';
            axis.baseInterval = {
              'timeUnit': 'day',
              'count': 1
            };
            break;
          case SummariesChartDataDateRages.Hourly:
            axis.dateFormatter.dateFormat = 'HH:mm dd MMM yyyy';
            axis.baseInterval = {
              'timeUnit': 'hour',
              'count': 1
            };
            break;
          default:
            break;
        }
        // @todo is there a bug here ?
        // axis.groupData = true;
        // axis.groupCount = 30;
        //
        // axis.groupIntervals.setAll([
        //   { timeUnit: "day", count: 30 },
        //   { timeUnit: "month", count: 1 },
        //   { timeUnit: "month", count: 12 },
        //   { timeUnit: "year", count: 1 },
        //   { timeUnit: "year", count: 10 }
        // ]);
        return axis;
      case ChartDataCategoryTypes.ActivityType:
        return super.getCategoryAxis();
      default:
        throw new Error(`Not implemented`);
    }
  }

  protected abstract generateChartData(data): SummariesChartDataInterface[];
}
