# This Dockerfile leverages multi-stage builds so
# only necessary build artifacts and resources are
# included in the final image.

# Enable passing the tag of the Node.js image as a build argument,
# and define a default tag in case the build argument is not passed.
# The Node.js image is used as the build image of the app,
# https://hub.docker.com/_/node/.
ARG NODE_IMAGE_TAG=22-alpine

# Enable passing the tag of the nginx image as a build argument,
# and define a default tag in case the build argument is not passed.
# The nginx image is used as the final image of the app,
# https://hub.docker.com/_/nginx.
ARG NGINX_IMAGE_TAG=1.28.3-alpine

# 1. Create intermediate build image from official Node.js image.
FROM node:${NODE_IMAGE_TAG} AS build
# Change working directory.
WORKDIR /abbi-ng-ai-image-descriptor
# Copy dependency manifests first to maximize layer cache reuse.
COPY package.json package-lock.json ./
# Install app dependencies deterministically.
RUN npm ci
# Copy all remaining files to the working directory.
COPY . .
# Build the Angular app.
RUN npm run build


# 2. Create final image from official nginx image.
FROM nginx:${NGINX_IMAGE_TAG} AS final
# Copy the dist/browser folder from the build image to the final, runtime image.
COPY --from=build /abbi-ng-ai-image-descriptor/dist/browser /usr/share/nginx/html
# Expose port 80 to the outside world
EXPOSE 80
# Start nginx server
CMD ["nginx", "-g", "daemon off;"]
