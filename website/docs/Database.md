# Database

**This feature is not available if you are using the built js version**

For a faster development, we offer a NoSQL solution that requires no configuration. We recommend to use [redis](https://github.com/NodeRedis/node_redis), [mongoose](https://github.com/Automattic/mongoose) or [rethinkdb](https://github.com/rethinkdb/rethinkdb) when your app is production-ready.

## Contents

- [Configuration](./Database.md#configuration) - Change the path of your NoSQL.
- [Get](./Database.md#get) - Retrieve by cid.
- [Insert](./Database.md#insert) - Insert, add or push a list of elements.
- [List](./Database.md#list) - List all elements in the collection.
- [Remove](./Database.md#remove) - Delete an item by cid.
- [Replace](./Database.md#replace) - Replace the element with the same cid.
- [Update](./Database.md#update) - Update an element, it will add un-existed key and replace existed.
- [Where](./Database.md#where) - Search using an object or operators.

## Configuration

Change the path of your NoSQL with ``client.nosql.path()``.

~~~ javascript
client.nosql.path("./data");
~~~

## Get

Retrieve by cid.

**Parameters:**

- ``collection``: _String_
- ``cid``: _Integer_

~~~ javascript
client.nosql.get("monsters", 3).then(function(data) {
    console.log(data);
});
~~~

## Insert

Insert, add or push a list of elements.

**Parameters:**

- ``collection``: _String_
- ``elements``: _Array_ or _Object_

~~~ javascript
client.nosql.insert("monsters", [
    {name: "sphinx", mythology: "greek", eyes: 2, sex: "f", hobbies: ["riddles","sitting","being a wonder"]},
    {name: "hydra", mythology: "greek", eyes: 18, sex: "m", hobbies: ["coiling","terrorizing","growing"]},
    {name: "huldra", mythology: "norse", eyes: 2, sex: "f", hobbies: ["luring","terrorizing"]},
    {name: "cyclops", mythology: "greek", eyes: 1, sex: "m", hobbies: ["staring","terrorizing"]},
    {name: "fenrir", mythology: "norse", eyes: 2, sex: "m", hobbies: ["growing","god-killing"]},
    {name: "medusa",  mythology: "greek", eyes: 2, sex: "f", hobbies: ["coiling","staring"]}
]).then(function() {
    console.log("Inserted data.");
});

client.nosql.insert("monsters", {name: "HamoIzm", mythology: "amazigh", eyes: 2, sex: "m", hobbies: ["riddles","hunting"]}).then(function() {
    console.log("Inserted data.");
});
~~~

## List

List all elements in the collection.

**Parameters:**

- ``collection``: _String_

~~~ javascript
client.nosql.list("monsters").then(function(result) {
    console.log(result);
});
~~~

## Remove

Delete an item by cid.

**Parameters:**

- ``collection``: _String_
- ``cid``: _Integer_

~~~ javascript
client.nosql.remove("monsters", 1).then(function() {
    console.log("Removed cid 1.");
});
~~~

## Replace

Replace the element with the same cid.

**Parameters:**

- ``collection``: _String_
- ``cid``: _Integer_
- ``elements``: _Array_ or _Object_

~~~ javascript
client.nosql.replace("monsters", 6, {car: "Ferrari"}).then(function() {
    console.log("Replaced cid 6..");

    client.nosql.get("monsters", 6).then(function(result) {
        console.log(result);
    });
});
~~~

## Update

Update an element, it will add un-existed key and replace existed. ($created and cid can't be changed)

**Parameters:**

- ``collection``: _String_
- ``cid``: _Integer_
- ``elements``: _Array_ or _Object_

~~~ javascript
client.nosql.update("monsters", 5, {eyes: 3, food:"waloo"}).then(function() {
    console.log("Updated cid 5..");

    client.nosql.get("monsters", 5).then(function(result) {
        console.log(result);
    });
});
~~~

## Where

Search using an object or operators.

**Parameters:**

- ``collection``: _String_
- ``elements``: _Array_ or _Object_

~~~ javascript
client.nosql.where("monsters", {name: "sphinx"}).then(function(result) {
    console.log(result);
});

client.nosql.where("monsters", "@eyes >= 2").then(function(result) {
    console.log(result);
});

client.nosql.where("monsters", "(@eyes == 2 && @mythology == 'greek') || (@mythology == 'amazing')").then(function(result) {
    console.log(result);
});
~~~
