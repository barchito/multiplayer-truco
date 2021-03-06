import { get } from "lodash";
import { firebaseDatabase } from "../firebase";
import {
  JOIN_GAME_REQUESTED,
  JOIN_GAME_FULFILLED,
  JOIN_GAME_REJECTED,
  LEAVE_GAME,
  LOAD_GAME
} from "./actionTypes";

const gamesRef = firebaseDatabase.ref("games");

// Load game

export function loadGame(gameId) {
  return dispatch => {
    gamesRef.child(gameId).on("value", snapshot => {
      dispatch({
        type: LOAD_GAME,
        payload: snapshot.val()
      });
    });
  };
}

//  Join game

function joinGameRequested() {
  return { type: JOIN_GAME_REQUESTED };
}

function joinGameFulfilled() {
  return { type: JOIN_GAME_FULFILLED };
}

function joinGameRejected(error) {
  console.error("ERROR joining game: ", error); // eslint-disable-line no-console
  return {
    type: JOIN_GAME_REJECTED,
    payload: error
  };
}

export function joinGame(userId, gameId) {
  return dispatch => {
    const gameRef = gamesRef.child(gameId);
    const gamePlayersRef = gameRef.child("players");

    return new Promise((resolve, reject) => {
      dispatch(loadGame(gameId));
      dispatch(joinGameRequested());

      gameRef
        .once("value")
        .then(snapshot => {
          if (!snapshot.exists()) {
            return Promise.reject(`There is no game with the id of ${gameId}`);
          }

          const game = snapshot.val();
          const newPlayerKey = gamePlayersRef.push().key;
          const updates = {
            players: {}
          };

          updates.players[newPlayerKey] = {
            id: userId
          };

          if (
            get(game, "players") &&
            Object.keys(game.players).length + 1 ===
              game.configuration.playersCount
          ) {
            updates.started = true;
          }

          return gameRef.update(updates);
        })
        .then(() => {
          dispatch(joinGameFulfilled());
          resolve();
        })
        .catch(error => {
          dispatch(joinGameRejected(error));
          reject(error);
        });
    });
  };
}

// Leave game

export function leaveGame(userId, userKey, gameId, gameCreatorId, gameStarted) {
  gamesRef.child(`${gameId}/players/${userKey}`).remove();

  return { type: LEAVE_GAME };
}
