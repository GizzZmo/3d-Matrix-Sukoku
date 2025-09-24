#include <iostream>
#include <vector>
#include <string>
#include <chrono>
#include <json/json.h>
#include <httplib.h>
#include <thread>

class SudokuSolver {
private:
    std::vector<std::vector<int>> board;
    const int SIZE = 9;

public:
    SudokuSolver() : board(SIZE, std::vector<int>(SIZE, 0)) {}

    bool isValid(int row, int col, int num) {
        // Check row
        for (int x = 0; x < SIZE; x++) {
            if (board[row][x] == num) return false;
        }

        // Check column
        for (int x = 0; x < SIZE; x++) {
            if (board[x][col] == num) return false;
        }

        // Check 3x3 box
        int startRow = row - row % 3;
        int startCol = col - col % 3;
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                if (board[i + startRow][j + startCol] == num) return false;
            }
        }

        return true;
    }

    bool solveSudoku() {
        for (int row = 0; row < SIZE; row++) {
            for (int col = 0; col < SIZE; col++) {
                if (board[row][col] == 0) {
                    for (int num = 1; num <= 9; num++) {
                        if (isValid(row, col, num)) {
                            board[row][col] = num;
                            if (solveSudoku()) return true;
                            board[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    void setBoard(const std::vector<std::vector<int>>& newBoard) {
        board = newBoard;
    }

    std::vector<std::vector<int>> getBoard() const {
        return board;
    }

    Json::Value getBoardAsJson() const {
        Json::Value jsonBoard(Json::arrayValue);
        for (int i = 0; i < SIZE; i++) {
            Json::Value row(Json::arrayValue);
            for (int j = 0; j < SIZE; j++) {
                row.append(board[i][j]);
            }
            jsonBoard.append(row);
        }
        return jsonBoard;
    }

    bool setBoardFromJson(const Json::Value& jsonBoard) {
        if (!jsonBoard.isArray() || jsonBoard.size() != SIZE) return false;
        
        for (int i = 0; i < SIZE; i++) {
            if (!jsonBoard[i].isArray() || jsonBoard[i].size() != SIZE) return false;
            for (int j = 0; j < SIZE; j++) {
                if (!jsonBoard[i][j].isInt()) return false;
                board[i][j] = jsonBoard[i][j].asInt();
            }
        }
        return true;
    }
};

class SudokuService {
private:
    httplib::Server server;

public:
    SudokuService() {
        setupRoutes();
    }

    void setupRoutes() {
        // Enable CORS for web frontend
        server.set_default_headers({
            {"Access-Control-Allow-Origin", "*"},
            {"Access-Control-Allow-Methods", "GET, POST, OPTIONS"},
            {"Access-Control-Allow-Headers", "Content-Type"}
        });

        // Health check endpoint
        server.Get("/health", [](const httplib::Request&, httplib::Response& res) {
            Json::Value response;
            response["status"] = "healthy";
            response["service"] = "sudoku-solver-cpp";
            response["version"] = "1.0.0";
            
            Json::StreamWriterBuilder builder;
            std::string jsonString = Json::writeString(builder, response);
            
            res.set_content(jsonString, "application/json");
        });

        // Solve sudoku puzzle endpoint
        server.Post("/solve", [](const httplib::Request& req, httplib::Response& res) {
            Json::Value root;
            Json::Reader reader;
            
            if (!reader.parse(req.body, root)) {
                res.status = 400;
                res.set_content("{\"error\": \"Invalid JSON\"}", "application/json");
                return;
            }

            SudokuSolver solver;
            if (!solver.setBoardFromJson(root["board"])) {
                res.status = 400;
                res.set_content("{\"error\": \"Invalid board format\"}", "application/json");
                return;
            }

            auto start = std::chrono::high_resolution_clock::now();
            bool solved = solver.solveSudoku();
            auto end = std::chrono::high_resolution_clock::now();
            
            auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

            Json::Value response;
            response["solved"] = solved;
            response["solvingTime"] = static_cast<int>(duration.count());
            response["board"] = solver.getBoardAsJson();
            
            Json::StreamWriterBuilder builder;
            std::string jsonString = Json::writeString(builder, response);
            
            res.set_content(jsonString, "application/json");
        });

        // Validate sudoku puzzle endpoint
        server.Post("/validate", [](const httplib::Request& req, httplib::Response& res) {
            Json::Value root;
            Json::Reader reader;
            
            if (!reader.parse(req.body, root)) {
                res.status = 400;
                res.set_content("{\"error\": \"Invalid JSON\"}", "application/json");
                return;
            }

            SudokuSolver solver;
            if (!solver.setBoardFromJson(root["board"])) {
                res.status = 400;
                res.set_content("{\"error\": \"Invalid board format\"}", "application/json");
                return;
            }

            Json::Value response;
            response["valid"] = true; // Implement validation logic
            response["conflicts"] = Json::Value(Json::arrayValue);
            
            Json::StreamWriterBuilder builder;
            std::string jsonString = Json::writeString(builder, response);
            
            res.set_content(jsonString, "application/json");
        });

        // Handle preflight CORS requests
        server.Options(".*", [](const httplib::Request&, httplib::Response& res) {
            return;
        });
    }

    void start() {
        std::cout << "Starting C++ Sudoku Solver Service on port 8081..." << std::endl;
        server.listen("0.0.0.0", 8081);
    }
};

int main() {
    SudokuService service;
    service.start();
    return 0;
}