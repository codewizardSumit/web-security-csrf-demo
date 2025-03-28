FROM node:18
# Set the working directory
WORKDIR /csrf_demo
# Copy package.json and package-lock.json to the working directory
COPY package*.json /csrf_demo/
# Install the application dependencies
# Use --silent to suppress npm output
RUN npm install --silent
# Copy the rest of the application code
COPY . /csrf_demo
# Expose the port the app runs on
EXPOSE 4000
CMD ["npm", "start"]
# docker build -t csrf_demo .
# docker run -p 5500:5500 csrf_demo
# docker run -p 5500:5500 --name csrf_demo csrf_demo
# docker exec -it csrf_demo /bin/bash
# docker run -p 5500:5500 --name csrf_demo -v $(pwd):/csrf_demo csrf_demo