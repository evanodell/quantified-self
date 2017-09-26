import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges} from '@angular/core';
import {DataPositionInterface} from '../../../../../entities/data/data.position.interface';
import {GeoLocationInfoService} from '../../../../../services/geo-location/app.geo-location-info.service';
import {GeoLocationInfo} from '../../../../../entities/geo-location-info/app.geo-location-info';
import {EventInterface} from "../../../../../entities/events/event.interface";

@Component({
  selector: 'app-card-map-location',
  templateUrl: './event.card.map.location.component.html',
  styleUrls: ['./event.card.map.location.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class EventCardMapLocationComponent {
  @Input() event: EventInterface;
}

