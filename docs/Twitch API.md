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

Since JSONP only supports the ``GET`` method, Twitch allows you to set the method in the URL and let you set the oauth token if needed. For instance, this is what you would need to do to change the title of a channel:

~~~ javascript
client.api({
    url: "https://api.twitch.tv/kraken/channels/schmoopiie?channel[status]=MY_TITLE&oauth_token=OAUTH_TOKEN&_method=put"
}, function(err, res, body) {
    console.log(body);
});
~~~

## Node.JS

We support all of the available options for the [request](https://github.com/request/request#requestoptions-callback) module. You can set the headers or change the method as you wish.

~~~ javascript
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
