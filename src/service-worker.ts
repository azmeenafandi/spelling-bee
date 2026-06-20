/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `spelling-bee-${version}`;

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll(build.concat(files)))
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
		)
	);
});
