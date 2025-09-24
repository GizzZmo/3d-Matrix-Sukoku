# C++ Sudoku Solver Service
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    pkg-config \
    libjsoncpp-dev \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/cpp/ .

RUN mkdir build && cd build && \
    cmake .. && \
    make

EXPOSE 8081

CMD ["./build/bin/sudoku_solver"]