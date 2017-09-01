//每次有任何文件更新，都需要更改缓存的版本号
var CACHE_VERSION_NAME = 'test-1' + 1;
//缓存的文件，注意更新文件需要使用md5或者时间戳，否则得不到更新(对于同步输出的html，不应该缓存)
var filesToBeCached = [

];

//通过ajax访问的url，这里可以缓存这些接口的数据，在离线时候使用
//并且，只适用于cache:true，定义好jsonp和jsonpCallback名称的请求
var ajaxUrls = [];

/*********************************SW主逻辑(勿动)**********************************/
/*********************************SW主逻辑(勿动)**********************************/
/*********************************SW主逻辑(勿动)**********************************/

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

var preTime = preHtmlTime = Date.now(), strategy = 2 * 60 * 1000;//接口数据缓存策略：2分钟

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
   * Cache html file.
   */
  if(url.indexOf('.html') > -1) {
    var htmlCacheName = url.split('.html')[0].slice(url.length - 10, url.length).replace('/', '');
    var now = Date.now(), shouldUpdateHtml = false;
    if((now - preHtmlTime > strategy)) {
      preHtmlTime = now;
      shouldUpdateHtml = true;
      console.log('[ServiceWorker] shoule update html.')
    }

    event.respondWith(
      caches.match(event.request).then(function(response) {
        return (!shouldUpdateHtml && response) || caches.open(htmlCacheName).then(function(cache) {
            return fetch(event.request).then(function(response){
              console.log('[ServiceWorker] fetch html file from server.')
              cache.put(event.request.url, response.clone());
              return response;
            });
        })
      })
    );
  } 
  /*
   * Cache api data.
   */
  else if (dataUrl) {
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

self.addEventListener('error', function(e) {
  console.log('event-error:', e);
  //删除所有缓存
  caches.keys().then(function (cacheNames) {
      return Promise.all(
          cacheNames.map(function (cacheName) {
              return caches.delete(cacheName);
          })
      );
  });

  //注销
  self.registration.unregister();
});

// self.onerror = function(message) {
//   console.log('self-onerror', message);
// };
