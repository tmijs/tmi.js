# API

This allows you to query the [Twitch API](https://github.com/justintv/Twitch-API) in your application. It supports JSONP requests but has its limitations.

## HTML (JSONP)

In order to support cross-domain AJAX requests, we support JSONP for web applications. You may use it as follow:

~~~ javascript
client.api({
    url: "https://api.twitch.tv/kraken/users/schmoopiie"
}, function(err, res, body) {
    console.log(body);
});
~~~

Because JSONP is only supporting the ``GET`` method, Twitch let you to set the method and the oauth token (if required) in the URL. For instance, this is what you would do to change the title of a channel:

~~~ javascript
client.api({
    url: "https://api.twitch.tv/kraken/channels/schmoopiie?channel[status]=MY_TITLE&oauth_token=OAUTH_TOKEN&_method=put"
}, function(err, res, body) {
    console.log(body);
});
~~~

## Node.JS

We support all of the available options of the [request](https://github.com/request/request#requestoptions-callback) module. By default, method is ``GET`` but it can be changed in the options.

~~~ javascript
// Basic example:
client.api({
    url: "https://api.twitch.tv/kraken/user"
}, function(err, res, body) {
    console.log(body);
});

// Using OAuth..
client.api({
    url: "https://api.twitch.tv/kraken/user",
    method: "GET",
    headers: {
        "Accept": "application/vnd.twitchtv.v3+json",
        "Authorization": "OAuth 3eb787117110834e079932bedfb8e6a7",
        "Client-ID": "1dac77895e8f56fa1a71e7c43ef09d87"
    }
}, function(err, res, body) {
    console.log(body);
});
~~~
