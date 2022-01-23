# Splashball

## Environment

This game was developed in [Node](https://nodejs.org/) version 14, but works even with the current stable version 16.

Any operating system should be compatible.

### Docker
If you use Docker, A Dockerfile is provided in case you want to build an image for yourself.

It's also available on Docker Hub. Use this command to pull the image:
```
docker pull zhongy1/splashball
```

If you're not sure how to run the image, check out guides online on how to run/stop Docker images.

## Run Locally

Install libraries:
```
npm install
```

Build the frontend code:
```
npm run frontend.build
```

Start the server:
```
npm run server
```

You should now be able to access localhost:3000 from a browser