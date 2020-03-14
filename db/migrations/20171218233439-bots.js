'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bots', 'storage', Sequelize.JSON);
  },

  down: async (queryInterface, Sequelize) => {
    return await queryInterface.removeColumn('bots', 'storage');
  }
};
