const QGIS_SERVER_URL = 'tu wpisz scieżkę do QGIS serwera i pliku qmpv.qgz';


var path_layer = new ol.layer.Vector({
		source: new ol.source.Vector({features: [pvl_path_feature]}),
		style: pvl_get_line_style('#0000FF', 9)
	});


function init()
{
	pvl_show_path = true;
	var start_point = [20.47689, 53.77383]; //budynek ZDZiT (Szrajbera)
	
	pvl_map = new ol.Map ({
			target: 'map',
			view: new ol.View
			({
				center: ol.proj.fromLonLat(start_point),
				zoom: 17
			})
		});
	
	var osm_layer = new ol.layer.Tile({source: new ol.source.OSM()});
	pvl_map.addLayer(osm_layer);
	
	var my_format = new ol.format.GeoJSON({featureProjection:"EPSG:3857"});
	var granice_Olsztyna_layer = new ol.layer.Vector({
			source: new ol.source.Vector({features: my_format.readFeatures(Granice_Olsztyna_val)}),
			style: mll_get_line_style('#a038ef', 2)
		});
	pvl_map.addLayer(granice_Olsztyna_layer);
	
	var mapa_zasadnicza_2019_layer = new ol.layer.Tile({
			source: new ol.source.TileWMS({
				url: QGIS_SERVER_URL,
				params: {
					'LAYERS': 'mapa_zasadnicza_2019',
					'TRANSPARENT': true,
					},
				serverType: 'qgis'
			})
		});
	pvl_map.addLayer(mapa_zasadnicza_2019_layer);
	
	var qmpv_point_work_data_layer = make_WFS_layer_with_GET_request('qmpv_point_work_data', lm_get_point_TRIANGLE_style('#FF0000', 15, '#FF0000'));
	pvl_map.addLayer(qmpv_point_work_data_layer);
	
	pvl_map.addLayer(path_layer);
	path_layer.setVisible(false);
	
	var marker_layer = new ol.layer.Vector({source: new ol.source.Vector({features: [pvl_marker_feature]}), style : pvl_get_point_circle_style('#0000FF', 10)});
	pvl_map.addLayer(marker_layer);
	
	pvl_map.on('click', function(evt) {
			var feature = pvl_map.forEachFeatureAtPixel(evt.pixel, function(feature)
				{ 
					return feature; 
				});
			if (feature) 
			{
				on_click(feature);
			}
		});
	
	pvl_map.getView().on('change:resolution', function(e) {
			if (pvl_map.getView().getZoom() > 17)
			{
				mapa_zasadnicza_2019_layer.setVisible(true);
			}
			else
			{
				mapa_zasadnicza_2019_layer.setVisible(false);
			}
		});
	
	//pvl_restore_lost_path();
	pvl_geolocation_start();
}


function on_click(feature)
{
	try
	{
		var properties_object = feature.getProperties();
		var keys = Object.keys(properties_object);
		if (keys.length > 0)
		{
			var tx = '';
			for (var key of keys)
			{
				if (key != 'id' && key != 'geometry')
				{
					tx += key + ': ' + properties_object[key] + '\n';
				}
			}
			if (tx.length > 0)
			{
				alert(tx);
			}
		}
	}
	catch (err)
	{
		console.log('on_click - ERROR: ' + JSON.stringify(err));
	}
}


function make_WFS_layer_with_GET_request(lyr_name, lyr_style)
{
	var res_layer = new ol.layer.Vector({source: new ol.source.Vector(), title: lyr_name});
	var wfs_url = QGIS_SERVER_URL + '&request=GetFeature&version=1.1.0&service=WFS&outputFormat=geoJSON&typeName=' + lyr_name;
	var frag = window.location.hash.substr(1);
	var none_style =  pvl_get_point_circle_style('#FFFFFF', 0);

	fetch(wfs_url, {method: 'GET'}).then(function(response) {return response.text();}).then(function(text) {
			var json = JSON.parse(text);
			var features = new ol.format.GeoJSON().readFeatures(json, {featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326'});
			for (var feature of features)
			{
				var properties_object = feature.getProperties();
				var keys = Object.keys(properties_object);
				if (frag && keys.includes('uwagi'))
				{
					if (feature.get('uwagi') && feature.get('uwagi').startsWith(frag))
					{
						feature.setStyle(lyr_style);
					}
					else
					{
						feature.setStyle(none_style);
					}
				}
				else
				{
					feature.setStyle(lyr_style);
				}
			}
			res_layer.getSource().addFeatures(features);
		});
	return res_layer;
}


function lm_get_point_TRIANGLE_style(l_col, rds, f_col)
{
	return new ol.style.Style({
			image: new ol.style.RegularShape({
					stroke: new ol.style.Stroke({color: l_col, width: 2}),
					fill: new ol.style.Fill({color: f_col}),
					points: 3,
					radius: rds
				})
		});
}


function mll_get_line_style(col, wdth)
{
	return new ol.style.Style({
			stroke: new ol.style.Stroke({color: col, width: wdth})
		});
}


function show_hide_path()
{
	if (path_layer.getVisible())
	{
		path_layer.setVisible(false);
	}
	else
	{
		path_layer.setVisible(true);
	}
}




