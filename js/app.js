"use strict";

// Contants
const NEARBY_SEARCH_RADIUS = 500;
const NEARBY_SEARCH_TERM = 'cafe';
const RESULT_LIMIT = 20;
const DEFAULT_CENTER_POS = {
    lat: 40.7413549,
    lng: -73.9980244
};

// Global Variables
let infoWindow;
let markers = [];
let yelp = new Yelp({
    api_key: 'tjLbjYy6ze0UvhOmhbwN931eK1d52o14r0ZYo5hAZuriJfzhKpZp4K07kEcNNBu4B-SXtBN7X62crsE0MyTkbmd4iPBn2WHzA0S2EhzBZGrjeIdhOAzi5kShhGrYWnYx'
});
let gmap = ko.observable();

// Google Map Callback
function initMap() {
    let map = new google.maps.Map(document.getElementById('map'), {
        center: DEFAULT_CENTER_POS,
        zoom: 16
    });
    infoWindow = new google.maps.InfoWindow();
    gmap(function () {
        return map;
    });
}
// Google Map Error Handler
let mapErrorHandler = function () {
    gmap(function () {
        throw new Error('Oops, loading Google map failed.');
    });
};

let Location = function (data) {
    this.name = data.name;
    this.id = data.id;
    this.phone = data.display_phone;
    this.lat = data.coordinates.latitude;
    this.lng = data.coordinates.longitude;
    this.rating = data.rating;
    this.image_url = data.image_url;
}

ko.bindingHandlers.mapCenter = {
    update: function (element, valueAccessor, allBindings, bindingContext) {
        if (gmap()) {
            let center = ko.unwrap(valueAccessor());
            gmap()().setCenter(center);
        }
    }
};

ko.bindingHandlers.mapMarkers = {
    update: function (element, valueAccessor, allBindings, bindingContext) {
        if (gmap()) {
            let locations = ko.unwrap(valueAccessor());
            markers.forEach(function (marker) {
                marker.setMap(null);
            });
            markers.lenghth = 0;
            locations.forEach(function (location) {
                location.marker = createMarker(location, gmap()(), bindingContext);
                markers.push(location.marker);
            });
        }

        function createMarker(location, map, viewModel) {
            let marker = new google.maps.Marker({
                map: map,
                position: {
                    lat: location.lat,
                    lng: location.lng
                }
            });
            google.maps.event.addListener(marker, 'click', function () {
                viewModel.selectedLocation(location);
            });

            return marker;
        }
    }
};

ko.bindingHandlers.mapDisplayMarkers = {
    update: function (element, valueAccessor, allBindings, bindingContext) {
        if (gmap()) {
            let filteredLocations = ko.unwrap(valueAccessor());
            let locations = bindingContext.locations();
            locations.forEach(function (location) {
                if (filteredLocations.some(function (filteredLocation) {
                        return filteredLocation.id === location.id;
                    })) {
                    if (location.marker) {
                        location.marker.setVisible(true);
                    }
                } else {
                    if (location.marker) {
                        location.marker.setVisible(false);
                    }
                }
            });
        }
    }
};

ko.bindingHandlers.mapSelectMarker = {
    update: function (element, valueAccessor, allBindings, bindingContext) {
        if (gmap()) {
            let selectedLocation = ko.unwrap(valueAccessor());
            if (selectedLocation) {
                showLocationInfo(selectedLocation, gmap()());
                showLocationMarkerAnimation(selectedLocation);
            }
        }

        function showLocationInfo(location, map) {
            let innerHTML = '<div class="noscrollbar">';
            if (location.name) {
                innerHTML += '<strong>' + location.name + '</strong>';
            }
            if (location.rating) {
                innerHTML += '<br><sup> Ratings: ' + location.rating + '/5 </sup>';
            }
            if (location.phone) {
                innerHTML += '<br>' + location.phone;
            }
            if (location.image_url) {
                innerHTML += '<br><br><img class="info-img" src="' + location.image_url + '">';
            }
            innerHTML += '</div>';
            infoWindow.setContent(innerHTML);
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

/**
 * Binds error message to a dismissable alert box
 * Ref: https://bthurley.wordpress.com/2013/10/08/a-first-knockout-custom-binding-to-display-twitter-bootstrap-alerts/
 */
ko.bindingHandlers.alert = {
    update: function (element, valueAccessor, allBindingsAccessor, bindingContext) {
        let errorMessage = ko.unwrap(valueAccessor());
        if (errorMessage) {
            let type = allBindingsAccessor().type;

            let alertClass = "alert-danger";
            if (type === "info") {
                alertClass = "alert-info";
            } else if (type === "warning") {
                alertClass = "alert-warning";
            } else if (type === "success") {
                alertClass = "alert-success";
            }

            element.innerHTML = '';
            let alertDiv = document.createElement("div");
            alertDiv.innerHTML = errorMessage + "<button type=\"button\" data-dismiss=\"alert\" class=\"close\"><span aria-hidden=\"true\">&times;</span></button>";
            alertDiv.className = "alert " + alertClass + " alert-dismissable" + " fade show mb-1 mx-2";

            element.appendChild(alertDiv);
        }
    }
};


// Knockout ViewModel
let ViewModel = function () {
    let self = this;
    // Sidebar toggle
    self.isSidebarActive = ko.observable(false);
    self.toggleSidebar = function () {
        self.isSidebarActive(!self.isSidebarActive());
    };

    ko.computed(function () {
        if (gmap() && typeof gmap() === 'function') {
            try {
                gmap()();
            } catch (e) {
                self.errorMessage(e.message);
            }
        }
    });
    self.centerPos = ko.observable(DEFAULT_CENTER_POS);
    self.center = ko.computed(function () {
        if (gmap()) {
            return new google.maps.LatLng(self.centerPos());
        }
    });

    self.isLoading = ko.observable(false);

    self.errorMessage = ko.observable('');

    self.locations = ko.observableArray([]).extend({
        deferred: true
    });
    // Update locations state after center pos changed
    ko.computed(function () {
        self.isLoading(true);
        yelp.search({
                latitude: self.centerPos().lat,
                longitude: self.centerPos().lng,
                radius: NEARBY_SEARCH_RADIUS,
                term: NEARBY_SEARCH_TERM,
                limit: RESULT_LIMIT
            })
            .then(function (data) {
                self.isLoading(false);
                if (data && data.businesses) {
                    if (data.businesses.length > 0) {
                        data.businesses.forEach(function (business) {
                            if (!business.is_closed) {
                                self.locations.push(new Location(business));
                            }
                        });
                    } else {
                        self.locations.removeAll();
                        self.errorMessage('Sorry, no nearby ' + NEARBY_SEARCH_TERM + ' found.');
                    }
                } else {
                    self.errorMessage("Error: no valid location.");
                }
            })
            .catch(function (err) {
                self.isLoading(false);
                self.errorMessage(err);
            });
    });

    self.keywords = ko.observable('');
    self.filteredLocations = ko.computed(function () {
        let filteredLocations = self.locations();
        if (self.keywords() && self.locations().length > 0) {
            filteredLocations = ko.utils.arrayFilter(filteredLocations, function (location) {
                return location.name.trim().toLowerCase().indexOf(self.keywords().trim().toLowerCase()) > -1;
            });
        }
        return filteredLocations;
    });

    self.selectedLocation = ko.observable();
    self.selectedID = ko.pureComputed(function () {
        if (self.selectedLocation()) {
            return self.selectedLocation().id;
        } else {
            return NaN;
        }
    });

    self.locate = function () {
        // Try HTML5 geolocation.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                let pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                self.centerPos(pos);
                self.keywords('');
            }, function () {
                self.errorMessage('Error: The Geolocation service failed.');
            });
        } else {
            self.errorMessage('Error: Your browser doesn\'t support geolocation.');
        }
    };
};

ko.applyBindings(new ViewModel());