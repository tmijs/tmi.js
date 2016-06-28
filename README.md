# tmi.js
[![Build Status](https://secure.travis-ci.org/tmijs/tmi.js.png?branch=master)](https://travis-ci.org/tmijs/tmi.js) [![Downloads](https://img.shields.io/npm/dm/tmi.js.svg?style=flat)](https://www.npmjs.org/package/tmi.js) [![Npm Version](https://img.shields.io/npm/v/tmi.js.svg?style=flat)](https://www.npmjs.org/package/tmi.js) [![Node Version](https://img.shields.io/node/v/tmi.js.svg?style=flat)](https://www.npmjs.org/package/tmi.js) [![Issues](https://img.shields.io/github/issues/tmijs/tmi.js.svg?style=flat)](https://github.com/tmijs/tmi.js/issues)

![](https://i.imgur.com/vsdO7N5.png)

The best place to start with tmi.js is our [documentation page](https://docs.tmijs.org/).

This module currently support [Node.js 4.x](https://nodejs.org/en/download/) and every browser that support WebSockets. The current WebSocket protocol being used by this module is **HyBi drafts 13-17**.

## Install

#### Node

Install Node using this [tutorial](https://www.npmjs.com/package/tmi.js/tutorial). Once installed, jump to the [documentation](https://docs.tmijs.org/) to get started.

~~~ bash
npm i tmi.js --save
~~~

#### CDN provided by MaxCDN

Reference the file directly in the script tag.

We support [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) (SRI) which allows the browser to verify that the files being delivered have not been modified. This [https://www.w3.org/TR/SRI/](https://www.w3.org/TR/SRI/) is currently being implemented by browsers. Adding the new integrity attribute will ensure your application gains this security improvement as browsers support it.

Use Subresource Integrity only if you reference a specific version of tmi.js.

~~~ html
<!--Sourcemap: //cdn.tmijs.org/js/1.1.0/tmi.js.map-->
<script src="//cdn.tmijs.org/js/1.1.1/tmi.min.js" integrity="sha384-8Q+qSu52Px9pRIc72XaZ9pFAFWO/bidhybR512f3TwwFKkdwyvF/lVKixrhp4u3h" crossorigin="anonymous"></script>
~~~

You **must** provide the major version when using the latest branch.

~~~ html
<!--Sourcemap: //cdn.tmijs.org/js/latest/1.x/tmi.js.map-->
<script src="//cdn.tmijs.org/js/latest/1.x/tmi.min.js"></script>
~~~

## Community

- Follow [@Schmoopiie on Twitter](https://twitter.com/Schmoopiie).
- Have a question that is not a bug report ? [Discuss on the tmi.js forum](http://www.tmijs.org/forums/).
- Found a bug ? [Submit an issue](https://github.com/tmijs/tmi.js/issues/new).

## Contributors

In order of the [most commits](https://github.com/tmijs/tmi.js/graphs/contributors):

- Schmoopiie - [https://github.com/Schmoopiie](https://github.com/Schmoopiie)
- ben-eb - [https://github.com/ben-eb](https://github.com/ben-eb)
- AlcaDesign - [https://github.com/AlcaDesign](https://github.com/AlcaDesign)
- celluj34 - [https://github.com/celluj34](https://github.com/celluj34)
- d-4-ni - [https://github.com/d-4-ni](https://github.com/d-4-ni)
- UnwrittenFun - [https://github.com/UnwrittenFun](https://github.com/UnwrittenFun)
- Hatsuney - [https://github.com/Hatsuney](https://github.com/Hatsuney)
- justinsacbibit - [https://github.com/justinsacbibit](https://github.com/justinsacbibit)
- joein3d - [https://github.com/joein3d](https://github.com/joein3d)
- egonny - [https://github.com/egonny](https://github.com/egonny)
- smalls89 - [https://github.com/smalls89](https://github.com/smalls89)
- subperks - [https://github.com/subperks](https://github.com/subperks)
- mertzt89 - [https://github.com/mertzt89](https://github.com/mertzt89)

## Contributing guidelines

Please review the [guidelines for contributing](https://github.com/tmijs/tmi.js/blob/master/CONTRIBUTING.md) of the [tmi.js repository](https://github.com/tmijs/tmi.js). We reserve the right to refuse a Pull Request if it does not meet the requirements.
