// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct GameScore {
    uint256 gameId;
    string playerAlias;
    uint256 score;
    uint256 userId;
}

contract TournamentScores {
    struct Tournament {
        bool exists;
        bool finished;
        GameScore[] scores;
    }

    mapping(uint256 => Tournament) private tournaments;

    event TournamentStored(uint256 indexed tournamentId);

    // Correspond exactement à ce que ton backend veut appeler
    function storeScores(uint256 tournamentId, GameScore[] calldata _scores) external {
        Tournament storage t = tournaments[tournamentId];
        require(!t.exists, "Tournament already stored");

        t.exists = true;
        t.finished = true;

        for (uint256 i = 0; i < _scores.length; i++) {
            t.scores.push(_scores[i]);
        }

        emit TournamentStored(tournamentId);
    }

    function getTournamentScores(uint256 tournamentId) external view returns (GameScore[] memory) {
        require(tournaments[tournamentId].exists, "Tournament not found");
        return tournaments[tournamentId].scores;
    }

    function isTournamentStored(uint256 tournamentId) external view returns (bool) {
        return tournaments[tournamentId].exists;
    }
}
