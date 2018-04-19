"use strict";

// Inspired by https://www.npmjs.com/package/yelp-api-v3
var Yelp = function (opts) {
    this.apiKey = opts.api_key;
    // Yelp does not support CORS officially
    this.baseUrl = 'https://cors-anywhere.herokuapp.com/' + 'https://api.yelp.com/v3/';
}

Yelp.prototype.get = function get(resource, params, callback) {
    var self = this;

    params = typeof params === 'undefined' ? {} : params;

    var promise = new Promise(function (resolve, reject) {
        if (self.apiKey) {
            $.ajax({
                url: self.baseUrl + resource + jsonToQueryString(params),
                method: "GET",
                cache: true,
                dataType: 'json',
                headers: {
                    'Authorization': 'Bearer ' + self.apiKey
                },
                success: function (data, status, xhr) {
                    if (status === 'success') {
                        resolve(data);
                    } else {
                        reject(err);
                    }
                },
                error: function (xhr, status, err) {
                    reject(err);
                }
            });
        } else {
            console.error("Yelp API Key is required.");
        }
    });

    if (typeof callback === 'function') {
        promise.then(function (res) {
            return callback(null, res);
        }).catch(function (err) {
            return callback(err);
        });
        return null;
    }

    return promise;
};

Yelp.prototype.search = function (params, callback) {
    return this.get('businesses/search', params, callback);
}

function jsonToQueryString(json) {
    return '?' + Object.keys(json).map(function (key) {
        if (key !== "price") {
            return encodeURIComponent(key) + '=' + encodeURIComponent(json[key]);
        } else {
            return key + "=" + json[key];
        }
    }).join('&');
}