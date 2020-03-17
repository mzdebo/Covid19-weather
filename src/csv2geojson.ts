import {get,  isArray, isNumber} from '@aerisweather/javascript-sdk/dist/utils';
import {parse} from 'papaparse';

export const csvToGeoJson = (data: string, config: {} = {}): {} => {
	let features = [];
	const rows = parse(data.trim(), config);
	if (rows && isArray(rows.data)) {
		const latProperty = get(config, 'fields.latitude') || 'latitude';
		const lonProperty = get(config, 'fields.longitude') || 'longitude';
		const idProperty = get(config, 'fields.id') || null;
		let count = 0;
		for (const row of rows.data) {
			if (isNumber(row[lonProperty]) && isNumber(row[latProperty])) {
				const id = (idProperty) ? row[idProperty] : 'id' + count;
				count++;
				features.push({
					type: 'feature',
					id: id,
					geometry: {
						type: 'Point',
						coordinates: [parseFloat(row[lonProperty]), parseFloat(row[latProperty])]
					},
					properties: row
				});
			} else {
				console.warn('Skipping because bad lat/lon:', row);
			}
		}
	}

	return {
		type: 'FeatureCollection',
		features: features
	};
};

