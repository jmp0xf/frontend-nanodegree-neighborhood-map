"use strict";

// Sidebar Toggle Script
$(document).ready(function () {
    $('#sidebarToggle').on('click', function () {
        $('#sidebar').toggleClass('active');
    });
});

// Contants
var NEARBY_SEARCH_RADIUS = '500';
var NEARBY_SEARCH_TYPE = 'cafe';
var DEFAULT_CENTER_POS = {
    lat: 40.7413549,
    lng: -73.9980244
};

// Global Variables
var infoWindow;
var map;
var gmaps = ko.observable();

// Google Map Callback
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: DEFAULT_CENTER_POS,
        zoom: 16
    });
    gmaps(google.maps);
    infoWindow = new google.maps.InfoWindow();
}

// Knockout ViewModel
var ViewModel = function () {
    var self = this;
    self.centerPos = ko.observable(DEFAULT_CENTER_POS);
    self.center = ko.computed(function () {
        if (gmaps()) {
            return new google.maps.LatLng(self.centerPos());
        }
    });

    // Update locations state after center pos changed
    ko.computed(function () {
        if (gmaps()) {
            var request = {
                location: self.center(),
                radius: NEARBY_SEARCH_RADIUS,
                type: [NEARBY_SEARCH_TYPE]
            };
            var service = new google.maps.places.PlacesService(map);
            service.nearbySearch(request, function (results, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                    self.locations.removeAll();
                    results.forEach(function (place) {
                        place.marker = createMarker(place, map);
                        self.locations.push(place);
                    });
                }
            });
        }
    });

    // Reset map view after center pos changed
    ko.computed(function () {
        if (gmaps()) {
            map.setCenter(self.center());
        }
    });
    self.keywords = ko.observable('');
    self.locations = ko.observableArray([]);
    self.filteredLocations = ko.computed(function () {
        var filteredLocations = [];
        self.locations().forEach(function (location) {
            if (!self.keywords() || location.name.trim().toLowerCase().indexOf(self.keywords().trim().toLowerCase()) > -1) {
                location.marker.setMap(map);
                filteredLocations.push(location);
            } else {
                location.marker.setMap(null);
            }
        });

        return filteredLocations;
    });

    self.selectedLocation = ko.observable();
    self.selectedPlaceID = ko.pureComputed(function () {
        if (self.selectedLocation()) {
            return self.selectedLocation().place_id;
        } else {
            return NaN;
        }
    });

    self.setLocation = function (location) {
        self.selectedLocation(location);
        showLocationInfo(location);
    }

    self.locate = function () {
        // Try HTML5 geolocation.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                self.centerPos(pos);
                self.keywords('');
            }, function () {
                handleLocationError(true, infoWindow, map);
            });
        } else {
            // Browser doesn't support Geolocation
            handleLocationError(false, infoWindow, map);
        }
    };

    function createMarker(place, map) {
        var placeLoc = place.geometry.location;
        var marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location
        });
        place.marker = marker;
        google.maps.event.addListener(marker, 'click', function () {
            showLocationInfo(place);
        });

        return marker;
    }

    function showLocationInfo(location) {
        self.selectedLocation(location);
        infoWindow.setContent(location.name);
        infoWindow.open(map, location.marker);
    }
};

function handleLocationError(browserHasGeolocation, infoWindow, map) {
    infoWindow.setPosition(map.getCenter());
    infoWindow.setContent(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
    infoWindow.open(map);
}

ko.applyBindings(new ViewModel());