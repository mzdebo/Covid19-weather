import MapSourceModule from '@aerisweather/javascript-sdk/dist/modules/MapSourceModule';
import {get, formatDate, isArray, isNumber} from '@aerisweather/javascript-sdk/dist/utils';
import {isLight} from '@aerisweather/javascript-sdk/dist/utils/color';
import {hexColorLinterp} from "hex-color-linterp";
import {csvToGeoJson} from "./csv2geojson";

const propColorMapping: {
	[key: string]: {
		default: string,
		minValue: number,
		maxValue: number,
		minColor: string,
		maxColor: string
	}
} = {
	Confirmed: {
		default: '9E9E9E',
		minValue: 1,
		maxValue: 5000,
		minColor: 'ffe800',
		maxColor: 'e00000'
	},
	Deaths: {
		default: '9E9E9E',
		minValue: 1,
		maxValue: 5000,
		minColor: 'ffe800',
		maxColor: 'e00000'
	},
	Recovered: {
		default: '9E9E9E',
		minValue: 1,
		maxValue: 5000,
		minColor: 'ffe800',
		maxColor: 'e00000'
	}
};

const numberWithCommas = (x: number) => {
	if (isNumber(x)) {
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}
	return x;
};

const progress = (start: number, end: number, val: number): number => {
	return Math.max(0, Math.min(1, (val - start) / (end - start)));
};

const colorForValue = (type: string, val: number): string => {
	const colorMapping = propColorMapping[type] || null;
	if (!colorMapping) return null;

	let useColor: string;
	if (val >= colorMapping.minValue) {
		if (colorMapping.minColor === colorMapping.maxColor) {
			useColor = colorMapping.minColor;
		} else {
			const pos = progress(colorMapping.minValue, colorMapping.maxValue, val);
			useColor = hexColorLinterp(pos, colorMapping.minColor, colorMapping.maxColor);
		}
	} else {
		useColor = colorMapping.default;
	}
	return `#${useColor}`;
};


const diameterForValue = (val: number): number => {
	let diameter = 28;
	if (val >= 10000) {
		diameter = 80 + Math.round(val / 2000);
	} else if (val >= 1000) {
		diameter = 45 + Math.round(val / 250);
	} else if (val >= 100) {
		diameter += Math.round(val / 100) + 3;
	}
	return diameter;
};


class Covid19Module extends MapSourceModule {

	private dataProp: string = 'Confirmed';

	public get id() {
		return 'covid19';
	}

	constructor(opts: any = null) {
		super(opts);
	}

	source(): any {

		// determine the date for the data set
		// it updates around midnight
		const d: Date = new Date();
		d.setDate(d.getUTCDate()-1);
		const dateOpts: any = { year: 'numeric', month: '2-digit', day: '2-digit' };
		const dataDate = new Intl.DateTimeFormat('en-US', dateOpts).format(d).replace(/\//g, '-');

		const dataUrl = `https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/${dataDate}.csv`;

		// noinspection JSUnusedGlobalSymbols
		return {
			type: 'geojson',
			data: {
				url: dataUrl,
				formatter: (data: string) => {
					if (data) {
						// noinspection JSUnusedGlobalSymbols
						return csvToGeoJson(data, {
							header: true,
							transformHeader: (header: string) => {
								return header.replace(/\W+/g, '_')
									.replace(/_+$/, '')
									.replace(/^Lat\w*$/i, 'Latitude')
									.replace(/^Long\w*$/i, 'Longitude');
							},
							fields: {
								latitude: 'Latitude',
								longitude: 'Longitude'
							}
						});
					} else {
						return [];
					}
				}
			},
			style: {
				marker: (data: any) => {
					const covidDataElem = parseInt(get(data, this.dataProp)) || 0;

					if (covidDataElem !== 0) {
						const circleDiameter: number = diameterForValue(covidDataElem);
						const circleColor: string = colorForValue(this.dataProp, covidDataElem);
						const textColor: string = (isLight(circleColor)) ? '#222222' : '#ffffff';

						return {
							svg: {
								shape: {
									type: 'circle',
									fill: {
										color: circleColor
									},
									stroke: {
										color: '#000000',
										width: 2
									}
								},
								text: {
									value: numberWithCommas(covidDataElem),
									anchor: 'start',
									position: 'center',
									autosize: false,
									color: textColor,
									translate: {
										y: -2
									}
								}
							},
							size: [circleDiameter, circleDiameter]
						};
					} else {
						return {
							skip: true
						};
					}
				}
			}
		};
	}

	controls(): any {
		return {
			id: this.id,
			title: 'COVID-19',
			filter: true,
			segments: [
				{
					id: `${this.id}-confirmed`,
					value: 'Confirmed',
					title: 'Confirmed Cases',
				},
				{
					id: `${this.id}-deaths`,
					value: 'Deaths',
					title: 'Confirmed Deaths',
				},
				{
					id: `${this.id}-recovered`,
					value: 'Recovered',
					title: 'Recovered',
				}
			]
		};
	}

	legend(): any {
		// Create and return the legend configuration for this module. If 'null' is returned, then
		// a legend will not be rendered when this module's map source is active.
		// re: https://www.aerisweather.com/docs/js/globals.html#legendoptions

		return null;
	}

	infopanel(): any {
		// noinspection JSUnusedGlobalSymbols
		return {
			views: [
				{
					renderer: (data: any) => {
						if (!data) return;

						const admin2 = get(data, 'Admin2');

						let info = `
                                        <div class="covid19">
                                            <div class="awxjs__ui-row">
                                                <div class="awxjs__ui-expand label">Last Updated:</div>
                                                <div class="awxjs__ui-expand value">${data.Last_Update}</div>
                                            </div>

                                            <div class="awxjs__ui-row">
                                                <div class="awxjs__ui-expand label">Country:</div>
                                                <div class="awxjs__ui-expand value">${data.Country_Region}</div>
                                            </div>

                                            <div class="awxjs__ui-row">
                                                <div class="awxjs__ui-expand label">State/Province:</div>
                                                <div class="awxjs__ui-expand value">${data.Province_State}</div>
                                            </div>
                                            `;
						if (admin2)
							info += `<div class="awxjs__ui-row">
                                                <div class="awxjs__ui-expand label">County / Parish:</div>
                                                <div class="awxjs__ui-expand value">${admin2}</div>
                                            </div>`;

						info += `<div class="awxjs__ui-row">
                                                <div class="awxjs__ui-expand label">Confirmed Cases:</div>
                                                <div class="awxjs__ui-expand value">${numberWithCommas(data.Confirmed)}</div>
                                            </div>

                                            <div class="awxjs__ui-row">
                                                <div class="awxjs__ui-expand label">Deaths:</div>
                                                <div class="awxjs__ui-expand value">${numberWithCommas(data.Deaths)}</div>
                                            </div>

                                            <div class="awxjs__ui-row">
                                                <div class="awxjs__ui-expand label">Recovered:</div>
                                                <div class="awxjs__ui-expand value">${numberWithCommas(data.Recovered)}</div>
                                            </div>

                                        </div>
                                        `;
						return info;
					}
				}
			]
		}
	}

	onInit() {
		// Perform custom actions when the module has been initialized with a map application
		// instance.

		this.app.on('layer:change:option', (e: any) => {
			let {id, value} = e.data || {};
			if (id === this.id) {
				if (isArray(value)) {
					value = value[0].filter;
				}
				this.dataProp = value;
			}
		});
	}

	onAdd() {
		// Perform custom actions when the module's map source has been added to the map and is
		// active.
	}

	onRemove() {
		// Perform custom actions when the module's map source has been removed from the map and
		// is no longer active.
	}

	onMarkerClick(marker: any, data: any) {
		const country: string = data.Country_Region;
		const admin2 = get(data, 'Admin2');
		const state = data.Province_State;
		let title = `COVID-19 ${country}`;
		if (admin2) title += ' - ' + admin2;
		if (state) {
			title += (admin2) ? ', ' : ' - ';
			title += state;
		}
		this.showInfoPanel(title, data);
	}

	onShapeClick(shape: any, data: any) {
		// Perform custom actions when a vector shape object associated with the module's map
		// source was clicked on the map. You can use this method to perform additional actions or
		// to display the info panel for the module with the shape's data, e.g.:
		//
		// this.showInfoPanel('Outlook', data);
	}


}

export default Covid19Module;
