import axios from 'axios';
import * as xml2js from 'xml2js';

// initial state
const initialState = {
  currentBook: undefined,
  error: undefined,
  loading: false,
};

// getters
const getters = {
  currentBook: state => state.currentBook,
  hasBook: state => !!state.currentBook,
  error: state => state.error,
  isLoading: state => state.loading,
};

// actions
const actions = {
  resetError({ commit }) {
    commit('setError', undefined);
  },

  getBook({ commit }, userId) {
    if (!userId || userId.trim().length === 0) {
      commit('setError', 'Please enter your Goodreads User ID');
      return Promise.reject(new Error('No UserID given'));
    }
    commit('setLoading', true);

    // Proxy Request to prevent CORS Error, due to bad goodreads api :(
    return axios.get('https://cors-anywhere.herokuapp.com/https://www.goodreads.com/review/list', {
      params: {
        v: process.env.VUE_APP_GOODREADS_VERSION,
        id: userId,
        key: process.env.VUE_APP_GOODREADS_KEY,
        shelf: process.env.VUE_APP_GOODREADS_SHELF,
        per_page: 1,
        sort: 'random',
      },
    })
      .then((response) => {
        xml2js.parseStringPromise(response.data, {
          explicitArray: false,
        })
          .then((result) => {
            try {
              const hasBooksResponse = !!result.GoodreadsResponse.books;
              const list = result.GoodreadsResponse[hasBooksResponse ? 'books' : 'reviews'];
              if (list.$.total === '0') {
                commit('setError', 'Your To-Read shelf seems to be empty.');
                commit('setCurrentBook', undefined);
              } else {
                const book = hasBooksResponse ? list.book : list.review.book;
                if (!book) {
                  throw new Error();
                }
                commit('setCurrentBook', book);
                commit('setError', undefined);
              }
            } catch (err) {
              console.error(err);
              commit('setCurrentBook', undefined);
              commit('setError', 'Could not load books. Please try again. Please note that mobile is not supported at this time');
            }
          });
      })
      .catch((error) => {
        if (error.response.status === 404) {
          commit('setError', 'Could not find a user with the given ID.');
        }
        if (error.response.status === 403) {
          commit('setError', 'It appears the user adjusted the privacy settings to not show the books on the To-Read shelf.');
        }
        commit('setCurrentBook', undefined);
      })
      .finally(() => {
        commit('setLoading', false);
      });
  },
};

// mutations
const mutations = {
  setCurrentBook(state, book) {
    state.currentBook = book;
  },
  setError(state, error) {
    state.error = error;
  },
  setLoading(state, loading) {
    state.loading = loading;
  },
};

export default {
  namespaced: true,
  state: initialState,
  getters,
  actions,
  mutations,
};
