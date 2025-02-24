import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { NgRedux } from "@angular-redux2/store";

import { MapService } from "./map.service";
import { Urls } from "../urls";
import type { ApplicationState, LatLngAlt } from "../models/models";

export type PoiRouterData = {
    source: string;
    id: string;
    language: string;
};

export class RouteStrings {
    public static readonly MAP = "map";
    public static readonly SHARE = "share";
    public static readonly URL = "url";
    public static readonly POI = "poi";
    public static readonly ROUTE_ROOT = "/";
    public static readonly ROUTE_MAP = `/${RouteStrings.MAP}`;
    public static readonly ROUTE_SHARE = `/${RouteStrings.SHARE}`;
    public static readonly ROUTE_URL = `/${RouteStrings.URL}`;
    public static readonly ROUTE_POI = `/${RouteStrings.POI}`;

    public static readonly LAT = "lat";
    public static readonly LON = "lon";
    public static readonly ZOOM = "zoom";
    public static readonly ID = "id";
    public static readonly SOURCE = "source";
    public static readonly BASE_LAYER = "baselayer";
    public static readonly LANGUAGE = "language";
    public static readonly EDIT = "edit";
}

@Injectable()
export class HashService {

    private static readonly PERSICION = 4;
    private static readonly HIGH_PERSICION = 6;
    private static readonly ZOOM_PERSICION = 2;

    constructor(private readonly router: Router,
                private readonly mapService: MapService,
                private readonly ngRedux: NgRedux<ApplicationState>) {
    }

    public resetAddressbar(): void {
        let state = this.ngRedux.getState();
        if (state.poiState.isSidebarOpen) {
            return;
        }
        let inMemoryState = state.inMemoryState;
        if (inMemoryState.shareUrl) {
            this.router.navigate([RouteStrings.ROUTE_SHARE, inMemoryState.shareUrl.id], { replaceUrl: true });
            return;
        }
        if (inMemoryState.fileUrl) {
            let queryParams = {} as any;
            if (inMemoryState.baseLayer) {
                queryParams.baselayer = inMemoryState.baseLayer;
            }
            this.router.navigate([RouteStrings.ROUTE_URL, inMemoryState.fileUrl],
                { queryParams, replaceUrl: true });
            return;
        }
        if (this.mapService.map && this.mapService.map.isMoving()) {
            return;
        }
        let location = this.ngRedux.getState().location;
        this.router.navigate([
            RouteStrings.ROUTE_MAP,
            (location.zoom + 1).toFixed(HashService.ZOOM_PERSICION),
            location.latitude.toFixed(HashService.PERSICION),
            location.longitude.toFixed(HashService.PERSICION)
        ],
            { replaceUrl: true });
    }

    public getHref(): string {
        let inMemoryState = this.ngRedux.getState().inMemoryState;
        if (inMemoryState.fileUrl != null) {
            let urlTree = this.router.createUrlTree([RouteStrings.URL, inMemoryState.fileUrl]);
            return Urls.baseAddress + urlTree.toString();
        }
        if (inMemoryState.shareUrl != null) {
            return this.getFullUrlFromShareId(inMemoryState.shareUrl.id);
        }
        return Urls.baseAddress;
    }

    public getMapAddress() {
        let location = this.ngRedux.getState().location;
        let urlTree = this.router.createUrlTree([RouteStrings.MAP,
            (location.zoom + 1).toFixed(HashService.ZOOM_PERSICION),
            location.latitude.toFixed(HashService.HIGH_PERSICION),
            location.longitude.toFixed(HashService.HIGH_PERSICION)]);
        return Urls.baseAddress + urlTree.toString();
    }

    public getFullUrlFromLatLng(latlng: LatLngAlt) {
        return this.getFullUrlFromPoiId({
            id: `${latlng.lat.toFixed(4)}_${latlng.lng.toFixed(4)}`,
            source: "Coordinates",
            language: null
        });
    }

    public getFullUrlFromPoiId(poiSourceAndId: PoiRouterData) {
        let urlTree = this.router.createUrlTree([RouteStrings.POI, poiSourceAndId.source, poiSourceAndId.id],
            { queryParams: { language: poiSourceAndId.language } });
        return Urls.baseAddress + urlTree.toString();
    }

    public getFullUrlFromShareId(id: string) {
        let urlTree = this.router.createUrlTree([RouteStrings.SHARE, id]);
        return Urls.baseAddress + urlTree.toString();
    }
}
