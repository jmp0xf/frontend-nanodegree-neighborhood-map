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
var markers = [];
var gmaps = ko.observable();

// Google Map Callback
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: DEFAULT_CENTER_POS,
        zoom: 16
    });
    infoWindow = new google.maps.InfoWindow();
    gmaps(google.maps);
}

ko.bindingHandlers.mapCenter = {
    update: function (element, valueAccessor, allBindings, bindingContext) {
        if (gmaps()) {
            var center = ko.unwrap(valueAccessor());
            map.setCenter(center);
        }
    }
};

ko.bindingHandlers.mapMarkers = {
    update: function (element, valueAccessor, allBindings, bindingContext) {
        if (gmaps()) {
            var locations = ko.unwrap(valueAccessor());
            markers.forEach(function (marker) {
                marker.setMap(null);
            });
            markers.lenghth = 0;
            locations.forEach(function (location) {
                location.marker = createMarker(location, map, bindingContext);
                markers.push(location.marker);
            });
        }

        function createMarker(place, map, viewModel) {
            var placeLoc = place.geometry.location;
            var marker = new google.maps.Marker({
                map: map,
                position: place.geometry.location
            });
            google.maps.event.addListener(marker, 'click', function () {
                viewModel.selectedLocation(place);
            });

            return marker;
        }
    }
};

ko.bindingHandlers.mapDisplayMarkers = {
    update: function (element, valueAccessor, allBindings, bindingContext) {
        if (gmaps()) {
            var filteredLocations = ko.unwrap(valueAccessor());
            var locations = bindingContext.locations();
            locations.forEach(function (location) {
                if (filteredLocations.some(function (filteredLocation) {
                        return filteredLocation.place_id === location.place_id;
                    })) {
                    if (location.marker) {
                        location.marker.setMap(map);
                    }
                } else {
                    if (location.marker) {
                        location.marker.setMap(null);
                    }
                }
            });
        }
    }
};

ko.bindingHandlers.mapSelectMarker = {
    update: function (element, valueAccessor, allBindings, bindingContext) {
        if (gmaps()) {
            var selectedLocation = ko.unwrap(valueAccessor());
            if (selectedLocation) {
                showLocationInfo(selectedLocation);
                showLocationMarkerAnimation(selectedLocation);
            }
        }

        function showLocationInfo(location) {
            infoWindow.setContent(location.name);
            infoWindow.open(map, location.marker);
        }

        function showLocationMarkerAnimation(location) {
            location.marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(function () {
                location.marker.setAnimation(null);
            }, 1400);
        }
    }
};

ko.bindingHandlers.handleLocationError = {
    update: function (element, valueAccessor, allBindings, bindingContext) {
        if (gmaps()) {
            var locationError = ko.unwrap(valueAccessor());
            if (locationError) {
                infoWindow.setPosition(map.getCenter());
                infoWindow.setContent(locationError);
                infoWindow.open(map);
            }
        }
    }
};


// Knockout ViewModel
var ViewModel = function () {
    var self = this;
    self.centerPos = ko.observable(DEFAULT_CENTER_POS);
    self.center = ko.computed(function () {
        if (gmaps()) {
            return new google.maps.LatLng(self.centerPos());
        }
    });

    self.locations = ko.observableArray([]).extend({
        deferred: true
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
                        self.locations.push(place);
                    });
                }
            });
        }
    });

    self.keywords = ko.observable('');
    self.filteredLocations = ko.computed(function () {
        var filteredLocations = self.locations();
        if (self.keywords() && self.locations().length > 0) {
            filteredLocations = ko.utils.arrayFilter(filteredLocations, function (location) {
                return location.name.trim().toLowerCase().indexOf(self.keywords().trim().toLowerCase()) > -1;
            });
        }
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

    self.locationError = ko.observable('');
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
                self.locationError('Error: The Geolocation service failed.');
            });
        } else {
            self.locationError('Error: Your browser doesn\'t support geolocation.');
        }
    };
};

ko.applyBindings(new ViewModel());