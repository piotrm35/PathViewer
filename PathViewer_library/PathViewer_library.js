/*
PathViewer_library (pvl)

Very simple library, based on OpenLayers (ol), that get a little help in showing Your position and path on a map.

author: Piotr Michałowski, Olsztyn, woj. W-M, Poland
piotrm35@hotmail.com
license: GPL v. 2.0
work start date: 15.09.2018
*/

//-----------------------------------------------------------------------------------
// public
const pvl_VERSION = '1.3';

var pvl_map;
var	pvl_path_feature = new ol.Feature({geometry: (new ol.geom.LineString([]))});
var pvl_marker_feature = new ol.Feature();
var pvl_my_format = new ol.format.GeoJSON({featureProjection:"EPSG:3857"});
var	pvl_show_path = true;

//-----------------------------------------------------------------------------------
// private
const _GEOLOCATION_ACCURACY_THRESHOLD = 10;	// [m]
const _ROTATION_DISTANCE_THRESHOLD = 10;	// [m]
const _AZIMUTH_THRESHOLD = Math.PI / 90;	// 2 degrees
var _last_azimuth = 0;
var _median_filter_list = [];
const _median_filter_list_MAX_LENGTH = 5;
var _sessionStorage_idx = 0;
var _geolocation, _last_position, _last_rotation_position;

//-----------------------------------------------------------------------------------
// public
function pvl_get_point_circle_style(col, rds)
{
	return new ol.style.Style
	({
		image: new ol.style.Circle
		({
			radius: rds,
			fill: new ol.style.Fill
			({
				color: col
			})
		})
	});
}

function pvl_get_line_style(col, wdth)
{
	return new ol.style.Style
	({
		stroke: new ol.style.Stroke
		({
			color: col,
			width: wdth
		})
	});
}

function pvl_get_polygon_style(l_col, wdth, f_col)
{
	return new ol.style.Style({
		stroke: new ol.style.Stroke
		({
			color: l_col,
			width: wdth
		}),
		fill: new ol.style.Fill({
			color: f_col
		})
	});
}

function pvl_restore_lost_path()	// restoring path lost after browser minimization
{
	if (pvl_show_path)
	{
		var keys;
		try
		{
			keys = Object.keys(sessionStorage);
		}
		catch (err)
		{
			keys =  null;
		}
		if (keys)
		{
			var res, tmp_pos;
			for (_sessionStorage_idx = 0; _sessionStorage_idx < keys.length; _sessionStorage_idx++)
			{
				try
				{
					res = sessionStorage.getItem(_sessionStorage_idx.toString()).split(",");
					tmp_pos = [parseFloat(res[0]), parseFloat(res[1])];
					pvl_path_feature.getGeometry().appendCoordinate(tmp_pos);
				}
				catch (err)
				{
					continue;
				}
			}
		}
	}
}

function pvl_geolocation_start()
{
	_geolocation = new ol.Geolocation
	({
		projection: pvl_map.getView().getProjection(),
		tracking: true,
		trackingOptions: {enableHighAccuracy: true, maximumAge: 10000}
	});
	_geolocation.on('change', _geolocation_on_change);
	_geolocation.on('error', _geolocation_on_error);
}

//-----------------------------------------------------------------------------------
// private
function _get_azimuth(position)
{
	if (_last_position)
	{
		var dx = position[0] - _last_position[0];
		var dy = position[1] - _last_position[1];
		var tmp_angle;
		if (dx == 0)
		{
			if (dy > 0)
			{
				tmp_angle = Math.PI / 2;
			}
			else if (dy < 0)
			{
				tmp_angle = -Math.PI / 2;
			}
		}
		else
		{
			tmp_angle = Math.atan(dy / dx);
		}
		if (tmp_angle)
		{
			tmp_angle = Math.PI / 2 - tmp_angle;
			if (dx < 0)
			{
				tmp_angle += Math.PI;
			}
			return tmp_angle;
		}
	}
	return null;
}

function _get_map_new_rotation(position)
{
	if (_last_rotation_position)
	{
		var dx = position[0] - _last_rotation_position[0];
		var dy = position[1] - _last_rotation_position[1];
		var dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < _ROTATION_DISTANCE_THRESHOLD)
		{
			return null;
		}
	}
	var azimuth = _get_azimuth(position);
	if (azimuth)
	{
		_median_filter_list.push(azimuth);
		if (_median_filter_list.length > _median_filter_list_MAX_LENGTH)
		{
			_median_filter_list.shift();
		}
		azimuth = _median_filter_list.slice(0).sort()[Math.floor(_median_filter_list.length / 2)];
		if (Math.abs(azimuth - _last_azimuth) > _AZIMUTH_THRESHOLD)
		{
			_last_azimuth = azimuth;
			_last_rotation_position = position;
			return -azimuth;
		}
	}
	return null;
}

function _geolocation_on_change()
{
	if (_geolocation.getAccuracy() <= _GEOLOCATION_ACCURACY_THRESHOLD)
	{
		var position = _geolocation.getPosition();
		if (pvl_show_path)
		{
			try
			{
				sessionStorage.setItem(_sessionStorage_idx.toString(), position.toString());
				_sessionStorage_idx++;
			}
			catch (err)
			{;}
			pvl_path_feature.getGeometry().appendCoordinate(position);
		}
		pvl_marker_feature.setGeometry(new ol.geom.Point(position));
		pvl_map.getView().animate({center: position, duration: 600});
		var rot = _get_map_new_rotation(position);
		if (rot)
		{
			pvl_map.getView().animate({rotation: rot, duration: 600});
		}
		if (!_last_position)
		{
			pvl_map.getView().setZoom(18);
		}
		_last_position = position;
	}
}

function _geolocation_on_error(error)
{
	if (!error.message.includes("time")) 
	{
		alert(error.message);
	}
}



