import MapSourceModule from '@aerisweather/javascript-sdk/dist/modules/MapSourceModule';
declare class Covid19Module extends MapSourceModule {
    private dataProp;
    get id(): string;
    constructor(opts?: any);
    source(): any;
    controls(): any;
    legend(): any;
    infopanel(): any;
    onInit(): void;
    onAdd(): void;
    onRemove(): void;
    onMarkerClick(marker: any, data: any): void;
    onShapeClick(shape: any, data: any): void;
}
export default Covid19Module;
