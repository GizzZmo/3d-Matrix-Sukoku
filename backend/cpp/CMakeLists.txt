cmake_minimum_required(VERSION 3.16)
project(SudokuSolver)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required packages
find_package(PkgConfig REQUIRED)

# Find jsoncpp
pkg_check_modules(JSONCPP jsoncpp)
if(NOT JSONCPP_FOUND)
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(JSONCPP REQUIRED jsoncpp)
endif()

# Include directories
include_directories(${JSONCPP_INCLUDE_DIRS})

# Add executable
add_executable(sudoku_solver sudoku_solver.cpp)

# Link libraries
target_link_libraries(sudoku_solver ${JSONCPP_LIBRARIES})
target_compile_options(sudoku_solver PRIVATE ${JSONCPP_CFLAGS_OTHER})

# Set output directory
set_target_properties(sudoku_solver PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
)