import { Component, Input, Output, EventEmitter } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

import { ResourcesService } from "../../services/resources.service";
import { ToastService } from "../../services/toast.service";
import { ClosableOverlayComponent } from "./closable-overlay.component";
import { Urls } from "../../urls";
import type { LatLngAlt } from "../../models/models";

@Component({
    selector: "missing-part-overlay",
    templateUrl: "./missing-part-overlay.component.html",
    styleUrls: ["./missing-part-overlay.component.scss"]
})
export class MissingPartOverlayComponent extends ClosableOverlayComponent {
    @Input()
    public latlng: LatLngAlt;

    @Input()
    public feature: GeoJSON.Feature<GeoJSON.LineString>;

    @Output()
    public removed: EventEmitter<any>;

    public hideCoordinates: boolean;

    constructor(resources: ResourcesService,
                private readonly httpClient: HttpClient,
                private readonly toastService: ToastService) {
        super(resources);
        this.removed = new EventEmitter();
        this.hideCoordinates = true;
    }

    public getHighwayType(): string {
        return this.feature.properties.highway || "track";
    }

    public setHighwayType(highwayType: string) {
        this.feature.properties.highway = highwayType;
    }

    public getColor(): string {
        return this.feature.properties.colour || "none";
    }

    public setColor(color: string) {
        this.feature.properties.colour = color;
        if (color === "none") {
            delete this.feature.properties.colour;
        }
    }

    public async addMissingPartToOsm() {
        try {
            await firstValueFrom(this.httpClient.put(Urls.osm, this.feature));
            this.toastService.success(this.resources.routeAddedSuccessfullyItWillTakeTime);
            this.remove();
        } catch (ex) {
            this.toastService.error(ex, this.resources.unableToSendRoute);
        }
    }

    public remove() {
        this.removed.emit();
    }
}
