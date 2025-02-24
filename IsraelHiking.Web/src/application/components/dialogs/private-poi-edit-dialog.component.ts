import { Component, ViewChild, ElementRef, AfterViewInit, HostListener, Inject } from "@angular/core";
import { MatDialogRef, MatDialog, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { SocialSharing } from "@ionic-native/social-sharing/ngx";
import { NgRedux } from "@angular-redux2/store";

import { BaseMapComponent } from "../base-map.component";
import { AddSimplePoiDialogComponent } from "./add-simple-poi-dialog.component";
import { ResourcesService } from "../../services/resources.service";
import { FileService } from "../../services/file.service";
import { ImageResizeService } from "../../services/image-resize.service";
import { NavigateHereService } from "../../services/navigate-here.service";
import { RunningContextService } from "../../services/running-context.service";
import { HashService } from "../../services/hash.service";
import { UpdatePrivatePoiAction, DeletePrivatePoiAction } from "../../reducers/routes.reducer";
import { Urls } from "../../urls";
import type { LinkData, MarkerData, ApplicationState } from "../../models/models";

interface IIconsGroup {
    icons: string[];
}

interface PrivatePoiEditDialogData {
    marker: MarkerData;
    routeId: string;
    index: number;
}

@Component({
    selector: "private-poi-edit-dialog",
    templateUrl: "private-poi-edit-dialog.component.html"
})
export class PrivatePoiEditDialogComponent extends BaseMapComponent implements AfterViewInit {
    private static readonly NUMBER_OF_ICONS_PER_ROW = 4;

    private routeId: string;
    private markerIndex: number;

    public marker: MarkerData;
    public url: LinkData;
    public imageLink: LinkData;
    public showIcons: boolean;
    public showCoordinates: boolean;
    public showUrl: boolean;
    public title: string;
    public markerType: string;
    public description: string;
    public iconsGroups: IIconsGroup[];

    @ViewChild("titleInput")
    public titleInput: ElementRef;

    constructor(resources: ResourcesService,
                private readonly fileService: FileService,
                private readonly imageResizeService: ImageResizeService,
                private readonly matDialog: MatDialog,
                private readonly dialogRef: MatDialogRef<PrivatePoiEditDialogComponent>,
                private readonly navigateHereService: NavigateHereService,
                private readonly runningContextService: RunningContextService,
                private readonly socialSharing: SocialSharing,
                private readonly hashService: HashService,
                private readonly ngRedux: NgRedux<ApplicationState>,
                @Inject(MAT_DIALOG_DATA) data: PrivatePoiEditDialogData) {
        super(resources);
        this.showIcons = false;
        this.showCoordinates = false;
        this.iconsGroups = [];
        let icons = [
            "star", "arrow-left", "arrow-right", "tint",
            "automobile", "bike", "hike", "four-by-four",
            "bed", "viewpoint", "fire", "flag",
            "coffee", "cutlery", "shopping-cart", "tree"
        ];
        let groups = icons.length / PrivatePoiEditDialogComponent.NUMBER_OF_ICONS_PER_ROW;
        for (let iconTypeIndex = 0;
            iconTypeIndex < groups;
            iconTypeIndex++) {
            this.iconsGroups.push({
                icons: icons.splice(0, PrivatePoiEditDialogComponent.NUMBER_OF_ICONS_PER_ROW)
            });
        }
        this.setMarkerAndRoute(data.marker, data.routeId, data.index);
    }

    public static openDialog(matDialog: MatDialog, marker: MarkerData, routeId: string, index: number) {
        setTimeout(() => {
                // for some reason, in android, the click event gets called on the dialog, this is in order to prevent it.
                matDialog.open(PrivatePoiEditDialogComponent,
                    {
                        maxWidth: "378px",
                        data: {
                            marker,
                            routeId,
                            index
                        } as PrivatePoiEditDialogData
                    });
            },
            100);
    }

    public ngAfterViewInit(): void {
        setTimeout(() => {
            // this is to trigger changes otherwise there's an error: Expression has changed after it was checked
            this.focusTitle();
        }, 25);
    }

    public toggleCoordinates() {
        this.showCoordinates = !this.showCoordinates;
    }

    private focusTitle() {
        if (this.titleInput && this.titleInput.nativeElement) {
            this.titleInput.nativeElement.focus();
        }
    }

    private setMarkerAndRoute(marker: MarkerData, routeId: string, index: number) {
        this.marker = marker;
        this.routeId = routeId;
        this.markerIndex = index;
        this.markerType = marker.type;
        this.title = marker.title;
        this.description = marker.description;
        this.imageLink = marker.urls.find(u => u.mimeType.startsWith("image"));
        this.url = marker.urls.find(u => !u.mimeType.startsWith("image"));
        this.showUrl = this.url != null;
    }

    public setMarkerType(markerType: string): void {
        this.markerType = markerType;
    }

    public save() {
        let urls = [];
        if (this.imageLink) {
            urls.push(this.imageLink);
        }
        if (this.url && this.url.url) {
            this.url.text = this.title;
            urls.push(this.url);
        }
        let updatedMarker = {
            title: this.title,
            description: this.description,
            latlng: this.marker.latlng,
            type: this.markerType,
            urls,
        };
        this.ngRedux.dispatch(new UpdatePrivatePoiAction({
            index: this.markerIndex,
            routeId: this.routeId,
            markerData: updatedMarker
        }));
    }

    public async addImage(e: any) {
        let file = this.fileService.getFileFromEvent(e);
        if (!file) {
            return;
        }
        let container = await this.imageResizeService.resizeImageAndConvert(file, false);
        this.imageLink = container.routes[0].markers[0].urls[0];
    }

    public clearImage() {
        this.imageLink = null;
    }

    public async uploadPoint() {
        AddSimplePoiDialogComponent.openDialog(this.matDialog, {
            latlng: this.marker.latlng,
            imageLink: this.imageLink,
            title: this.title,
            description: this.description,
            markerType: this.markerType
        });
        this.dialogRef.close();
    }

    public remove() {
        this.ngRedux.dispatch(new DeletePrivatePoiAction({
            routeId: this.routeId,
            index: this.markerIndex
        }));
    }

    public addUrl() {
        this.showUrl = true;
        if (this.url == null) {
            this.url = {
                text: this.title,
                mimeType: "text/html",
                url: ""
            };
        }

    }

    public removeUrl() {
        this.url = null;
    }

    public async navigateHere() {
        await this.navigateHereService.addNavigationSegment(this.marker.latlng, this.title);
    }

    public canShareLocation() {
        return this.runningContextService.isCordova;
    }

    public shareLocation() {
        let ihmCoordinateUrl = this.hashService.getFullUrlFromLatLng(this.marker.latlng);
        this.socialSharing.shareWithOptions({
            message: `geo:${this.marker.latlng.lat},${this.marker.latlng.lng}\n${ihmCoordinateUrl}`
        });
    }

    public getWazeAddress() {
        return `${Urls.waze}${this.marker.latlng.lat},${this.marker.latlng.lng}`;
    }

    @HostListener("window:keydown", ["$event"])
    public onEnterPress($event: KeyboardEvent) {
        if ($event.shiftKey) {
            return true;
        }
        if ($event.key !== "Enter") {
            return true;
        }
        this.save();
        this.dialogRef.close();
        return false;
    }
}
