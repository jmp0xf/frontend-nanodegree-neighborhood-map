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
var gmaps = ko.observable();

// Google Map Callback
function initMap() {
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
    self.map = ko.computed(function () {
        if (gmaps()) {
            return new google.maps.Map(document.getElementById('map'), {
                center: self.center(),
                zoom: 16
            });
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
            var service = new google.maps.places.PlacesService(self.map());
            service.nearbySearch(request, function (results, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                    self.locations.removeAll();
                    results.forEach(function (place) {
                        self.locations.push(place);
                        createMarker(place, self.map());
                    });
                }
            });
        }
    });

    // Reset map view after center pos changed
    ko.computed(function () {
        if (self.map()) {
            self.map().setCenter(self.center());
        }
    });
    self.keywords = ko.observable('');
    self.locations = ko.observableArray([]);
    self.filteredLocations = ko.computed(function () {
        var filteredLocations = self.locations();
        if (self.keywords() && self.locations().length > 0) {
            filteredLocations = ko.utils.arrayFilter(filteredLocations, function (location) {
                return location.name.trim().toLowerCase().indexOf(self.keywords().trim().toLowerCase()) > -1;
            });
        }
        return filteredLocations;
    });

    self.currentLocation = ko.observable();

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
                handleLocationError(true, infoWindow, self.map());
            });
        } else {
            // Browser doesn't support Geolocation
            handleLocationError(false, infoWindow, self.map());
        }
    };
};

function createMarker(place, map) {
    var placeLoc = place.geometry.location;
    var marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location
    });

    // google.maps.event.addListener(marker, 'click', function () {
    //     infowindow.setContent(place.name);
    //     infowindow.open(map, this);
    // });
}

function handleLocationError(browserHasGeolocation, infoWindow, map) {
    infoWindow.setPosition(map.getCenter());
    infoWindow.setContent(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
    infoWindow.open(map);
}

ko.applyBindings(new ViewModel());