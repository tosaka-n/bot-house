'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.createTable('sessions', {
      id: {
        allowNull    : false,
        autoIncrement: true,
        primaryKey   : true,
        type         : Sequelize.INTEGER
      },
      session_id: {
        allowNull: false,
        unique   : true,
        type     : Sequelize.STRING
      },
      expires: {
        type: Sequelize.DATE
      },
      user_id: {
        type     : Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type     : Sequelize.DATEONLY
      },
      updated_at: {
        allowNull: false,
        type     : Sequelize.DATE
      }
    }).then(() => {
      return queryInterface.addIndex('sessions', ['session_id']);
    });
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable('sessions');
  }
};
