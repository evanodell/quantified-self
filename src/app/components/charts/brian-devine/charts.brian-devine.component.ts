import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
} from '@angular/core';
import { Log } from 'ng2-logger/browser'
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import { DashboardChartAbstract } from '../dashboard-chart.abstract';
import { AppEventColorService } from '../../../services/color/app.event.color.service';

@Component({
  selector: 'app-brian-devine-chart',
  templateUrl: './charts.brian-devine.component.html',
  styleUrls: ['./charts.brian-devine.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsBrianDevineComponent extends DashboardChartAbstract implements OnChanges, OnDestroy {

  @Input() data: { weekly: any[], daily: any[] };


  protected logger = Log.create('ChartsBrianDevineComponent');

  constructor(protected zone: NgZone, changeDetector: ChangeDetectorRef, private eventColorService: AppEventColorService) {
    super(zone, changeDetector);
  }

  ngAfterViewInit(): void {
    am4core.options.queue = true;
    am4core.options.onlyShowOnViewport = false;
    this.chart = <am4charts.XYChart>this.createChart();
    this.chart.data = this.data.weekly || [];
  }

  ngOnChanges(simpleChanges) {
    this.isLoading ? this.loading() : this.loaded();
    // If there is a new theme we need to destroy the chart and readd the data;
    // If theme changes destroy the chart
    if (simpleChanges.chartTheme && this.chart) {
      this.destroyChart();
      this.chart = <am4charts.XYChart>this.createChart();
      this.chart.data = this.data.weekly || [];
    }

    if (!this.data) {
      return;
    }

    if (simpleChanges.data) {

      // @todo not sure if "important" as the caller also does the same
      this.data.weekly = [...this.data.weekly].sort(this.sortData(this.chartDataCategoryType)).map((data) => {
        return {...data, ...{endTime: data.time + 7 * 24 * 60 * 60 * 1000}}
      }) // Important to create new array
      this.data.daily = [...this.data.daily].sort(this.sortData(this.chartDataCategoryType)); // Important to create new array
      if (this.chart) {
        this.chart.data = this.data.weekly || [];
        // @todo should it also invalidate?
        this.chart.invalidateLabels();
      }
    }
  }

  protected createChart(): am4charts.XYChart {
    debugger
    const chart = <am4charts.RadarChart>super.createChart(am4charts.RadarChart);
    chart.innerRadius = am4core.percent(15);
    chart.radius = am4core.percent(90);
    // chart.data = weeklyData; // Add weekly
    chart.fontSize = '11px';
    chart.startAngle = 95;
    chart.endAngle = chart.startAngle + 350;
    // Create axes
    const dateAxis = chart.xAxes.push(<am4charts.DateAxis<am4charts.AxisRendererCircular>>new am4charts.DateAxis());
    dateAxis.baseInterval = {timeUnit: 'week', count: 1};
    dateAxis.renderer.innerRadius = am4core.percent(40);
    dateAxis.renderer.minGridDistance = 5;
    dateAxis.renderer.labels.template.relativeRotation = 0;
    dateAxis.renderer.labels.template.location = 0.5;
    dateAxis.renderer.labels.template.radius = am4core.percent(-57);
    dateAxis.renderer.labels.template.fontSize = '8px';
    dateAxis.dateFormats.setKey('week', 'w');
    dateAxis.periodChangeDateFormats.setKey('week', 'w');
    dateAxis.cursorTooltipEnabled = false;

    const valueAxis = chart.yAxes.push(<am4charts.ValueAxis<am4charts.AxisRendererRadial>>new am4charts.ValueAxis());
    valueAxis.renderer.inversed = true;
    valueAxis.renderer.radius = am4core.percent(40);
    valueAxis.renderer.minGridDistance = 15;
    valueAxis.renderer.minLabelPosition = 0.05;
    valueAxis.renderer.axisAngle = 90;
    valueAxis.cursorTooltipEnabled = false;
    valueAxis.renderer.labels.template.fill = am4core.color('#ffffff');

    // weekday axis
    const weekDayAxis = chart.yAxes.push(<am4charts.CategoryAxis<am4charts.AxisRendererRadial>>new am4charts.CategoryAxis());
    weekDayAxis.dataFields.category = 'day';
    // weekDayAxis.data = dailyData; @todo
    weekDayAxis.renderer.innerRadius = am4core.percent(50);
    weekDayAxis.renderer.minGridDistance = 10;
    weekDayAxis.renderer.grid.template.location = 0;
    weekDayAxis.renderer.line.disabled = true;
    weekDayAxis.renderer.axisAngle = 90;
    weekDayAxis.cursorTooltipEnabled = false;
    weekDayAxis.renderer.labels.template.fill = am4core.color('#ffffff');

    // add month ranges
    // const firstDay = new Date(data[0]["Activity Date"]);
    const firstDay = new Date('01-01-2020');

    for (let i = 0; i < 13; i++) {
      const range = dateAxis.axisRanges.create();
      range.date = new Date(firstDay.getFullYear(), i, 0, 0, 0, 0);
      range.endDate = new Date(firstDay.getFullYear(), i + 1, 0, 0, 0, 0);
      if (i % 2) {
        range.axisFill.fillOpacity = 0.4;
      } else {
        range.axisFill.fillOpacity = 0.8;
      }
      (<am4charts.AxisFillCircular>range.axisFill).radius = -28;
      (<am4charts.AxisFillCircular>range.axisFill).adapter.add('innerRadius', function (innerRadius, target) {
        return dateAxis.renderer.pixelRadius + 7;
      })
      range.axisFill.fill = am4core.color('#b9ce37');
      range.axisFill.stroke = am4core.color('#5f6062');
      range.grid.disabled = true;
      range.label.text = chart.dateFormatter.language.translate(chart.dateFormatter.months[i]);
      (<am4charts.AxisLabelCircular>range.label).bent = true;
      (<am4charts.AxisLabelCircular>range.label).radius = 10;
      range.label.fontSize = 10;
      range.label.paddingBottom = 5;
      range.label.interactionsEnabled = false;
      range.axisFill.interactionsEnabled = true;
      range.axisFill.cursorOverStyle = am4core.MouseCursorStyle.pointer;
      range.axisFill.events.on('hit', function (event) {
        if (dateAxis.start == 0 && dateAxis.end == 1) {
          // dateAxis.zoomToDates(event.target.dataItem.date, event.target.dataItem.endDate); @todo
        } else {
          dateAxis.zoom({start: 0, end: 1});
        }
      })
    }


    // Create series
    const columnSeries = chart.series.push(new am4charts.RadarColumnSeries());
    columnSeries.dataFields.dateX = 'date';
    columnSeries.dataFields.valueY = 'distance';
    columnSeries.columns.template.strokeOpacity = 0;
    columnSeries.columns.template.width = am4core.percent(95);
    columnSeries.fill = am4core.color('#ffffff');
    columnSeries.fillOpacity = 0.6;
    columnSeries.tooltip.fontSize = 10;
    columnSeries.tooltip.pointerOrientation = 'down';
    columnSeries.tooltip.background.fillOpacity = 0.5;
    columnSeries.columns.template.tooltipText = '[bold]{date} - {endDate}\n[font-size:13px]Total {valueY} km';
    columnSeries.cursorTooltipEnabled = false;


    // bubble series
    const bubbleSeries = chart.series.push(new am4charts.RadarSeries())
    bubbleSeries.dataFields.dateX = 'date';
    bubbleSeries.dataFields.categoryY = 'day';
    bubbleSeries.dataFields.value = 'distance';
    bubbleSeries.yAxis = weekDayAxis;
    // bubbleSeries.data = dailyData; @todo
    bubbleSeries.strokeOpacity = 0;
    bubbleSeries.maskBullets = false;
    bubbleSeries.cursorTooltipEnabled = false;
    bubbleSeries.tooltip.fontSize = 10;
    bubbleSeries.tooltip.pointerOrientation = 'down';
    bubbleSeries.tooltip.background.fillOpacity = 0.4;

    const bubbleBullet = bubbleSeries.bullets.push(new am4charts.CircleBullet())
    bubbleBullet.locationX = 0.5;
    bubbleBullet.stroke = am4core.color('#b9ce37');
    bubbleBullet.fill = am4core.color('#b9ce37');
    bubbleBullet.tooltipText = '[bold]{date}, {value} km\n[font-size:13px]{title}';
    bubbleBullet.adapter.add('tooltipY', function (tooltipY, target) {
      return -target.circle.radius;
    })

    bubbleSeries.heatRules.push({target: bubbleBullet.circle, min: 2, max: 12, dataField: 'value', property: 'radius'});
    bubbleSeries.dataItems.template.locations.categoryY = 0.5;


    chart.cursor = new am4charts.RadarCursor();
    chart.cursor.innerRadius = am4core.percent(40);
    chart.cursor.lineY.disabled = true;


    const label = chart.radarContainer.createChild(am4core.Label);
    label.horizontalCenter = 'middle';
    label.verticalCenter = 'middle';
    label.fill = am4core.color('#ffffff');
    label.fontSize = 12;
    label.fontWeight = 'bold';
    label.text = 'WEEKLY\nTOTALS';

    const title = chart.createChild(am4core.Label);
    title.fill = am4core.color('#b9ce37');
    title.fontSize = 20;
    title.isMeasured = false;
    title.valign = 'top';
    title.align = 'left';
    title.wrap = true;
    title.width = 200;
    // @todo
    // title.text = '[bold]IN ' + firstDay.getFullYear() + '\nI CYCLED ' + Math.round(total) + ' km.\n[font-size:11; #ffffff]Each circle represents a bike ride. Size represents distance.';

    const link = chart.createChild(am4core.TextLink);
    link.fill = am4core.color('#ffffff');
    link.fontSize = 13;
    link.url = 'https://www.instagram.com/brian_devine/';
    link.valign = 'bottom';
    link.align = 'right';
    link.marginRight = 10;
    link.text = 'Chart design inspired by Brian Devine';

    return chart;
  }

  // ngOnChanges(changes: SimpleChanges) {
  // }
}