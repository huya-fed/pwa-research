/**
* 每次有任何文件更新，都需要更改缓存的版本号,才能使得更新生效
*/
var CACHE_VERSION_NAME = 'pwa-test7-v' + 27;
/**
* 需要缓存的文件。注:
* 1: 对于同步输出的html，不应该缓存
* 2: 如果更新的文件是html，也需要加上时间戳或者版本号,如"./index.html?v=1",并且访问的时候也是如此
* 3: 更新过的文件需要使用md5格式名称或者在文件名后加上时间戳(和引用方式同步,如<link rel="stylesheet" href="css/index.css?t=1">,则这里配置的名称为"css/index.css?t=1")
*/
var filesToBeCached = [
  "./",
  "./index.html?t=1",
  "./css/index.css?t=1",
  "./css/widget.css?t=1",
  "./js/zepto.min.js",
  "./js/underscore.min.js",
  "./js/app.js?t=6",
  "./img/bage-1_516ac78.png",
  "./img/bage-2_6f468b3.png",
  "./img/bage-3_26b75d3.png",
  "./img/bage-4_ab5bbcb.png",
  "./img/bage-5_15751da.png",
  "./img/bage-6_e0f5db5.png",
  "./img/bage-7_7d3826f.png",
  "./img/bage-8_a5b9cf5.png",
  "./img/bage-9_c89c3f1.png",
  "./img/icon-live_e952f41.png",
  "./img/rank-1_98b26e9.png",
  "./img/rank-2_9e73c92.png",
  "./img/rank-3_3d31dbe.png",
  "./img/rank-title-1_755130e.png"
];

/**
* 配置通过ajax访问的url，用于缓存接口的数据，这样接口也不用每次去线上请求，注:
* 1: 只适用于cache:true的接口，并且需要定义好jsonp和jsonpCallback名称的请求，即不能是动态的接口
* 2: 这里设置了接口缓存的有效期为2分钟，即2分钟后会拉取线上的数据，并且更新到本地
*/
var ajaxUrls = ["https://q.huya.com/index.php?m=Badge&do=getFansNumUpList"];








/*********************************SW主逻辑(勿动)**********************************/
/*********************************SW主逻辑(勿动)**********************************/
/*********************************SW主逻辑(勿动)**********************************/

/*********************************兼容**********************************/
if (!Cache.prototype.add) {
  Cache.prototype.add = function add(request) {
    return this.addAll([request]);
  };
}

if (!Cache.prototype.addAll) {
  Cache.prototype.addAll = function addAll(requests) {
    var cache = this;

    // Since DOMExceptions are not constructable:
    function NetworkError(message) {
      this.name = 'NetworkError';
      this.code = 19;
      this.message = message;
    }
    NetworkError.prototype = Object.create(Error.prototype);

    return Promise.resolve().then(function() {
      if (arguments.length < 1) throw new TypeError();
      
      // Simulate sequence<(Request or USVString)> binding:
      var sequence = [];

      requests = requests.map(function(request) {
        if (request instanceof Request) {
          return request;
        }
        else {
          return String(request); // may throw TypeError
        }
      });

      return Promise.all(
        requests.map(function(request) {
          if (typeof request === 'string') {
            request = new Request(request);
          }

          var scheme = new URL(request.url).protocol;

          if (scheme !== 'http:' && scheme !== 'https:') {
            throw new NetworkError("Invalid scheme");
          }

          return fetch(request.clone());
        })
      );
    }).then(function(responses) {
      // TODO: check that requests don't overwrite one another
      // (don't think this is possible to polyfill due to opaque responses)
      return Promise.all(
        responses.map(function(response, i) {
          return cache.put(requests[i], response);
        })
      );
    }).then(function() {
      return undefined;
    });
  };
}

if (!CacheStorage.prototype.match) {
  // This is probably vulnerable to race conditions (removing caches etc)
  CacheStorage.prototype.match = function match(request, opts) {
    var caches = this;

    return this.keys().then(function(cacheNames) {
      var match;

      return cacheNames.reduce(function(chain, cacheName) {
        return chain.then(function() {
          return match || caches.open(cacheName).then(function(cache) {
            return cache.match(request, opts);
          }).then(function(response) {
            match = response;
            return match;
          });
        });
      }, Promise.resolve());
    });
  };
}

self.addEventListener('install', function(event) {
  console.log('[ServiceWorker] install')
  event.waitUntil(
  	caches.open(CACHE_VERSION_NAME).then(function(cache) {
  		return cache.addAll(filesToBeCached);
  	}).then(function() {
  		console.log('[ServiceWorker] skip wating')
  		if (typeof self.skipWaiting === 'function') {
          // Force the SW to transition from installing -> active state
          self.skipWaiting();
      }
  	})
  );
});

/**
* 接口数据缓存策略：2分钟
*/
var preTime = Date.now(), strategy = 2 * 60 * 1000;

self.addEventListener('fetch', function(event) {
	console.log('[ServiceWorker] fetch url' + event.request.url)
  var url = event.request.url;
  var dataUrl = '';

  for(var i = 0,len = ajaxUrls.length;i<len;i++) {
   var item = ajaxUrls[i];
   if(url.indexOf(item) > -1) {
    dataUrl = item;
    break;
   }
  }

  /*
  * Cache api data.
  */
  if (dataUrl) {
    var dataCacheName = dataUrl.slice(dataUrl.length - 20, dataUrl.length) + 'v1';
    var now = Date.now(), shouldUpdate = false;

    if((now - preTime > strategy)) {
      preTime = now;
      shouldUpdate = true;
      console.log('[ServiceWorker] shoule update api data.')
    }

    event.respondWith(
      caches.match(event.request).then(function(response) {
        return (!shouldUpdate && response) || caches.open(dataCacheName).then(function(cache) {
            return fetch(event.request).then(function(response){
              console.log('[ServiceWorker] fetch api data from server.')
              cache.put(event.request.url, response.clone());
              return response;
            });
        })
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
  }
});

self.addEventListener('activate', function(e) {
  console.log('[ServiceWorker] Activate');
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== CACHE_VERSION_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});