// // ------------------------------------------------------------------
// // APP CONFIGURATION
// // ------------------------------------------------------------------

// module.exports = {
//     logging: true,
 
//     intentMap: {
//        'AMAZON.StopIntent': 'END',
//     },
 
//     db: {
//          FileDb: {
//              pathToFile: '../db/db.json',
//          }
//      },
//  };

// Production config - DynamoDB

module.exports = {
    // Other configurations
    db: {
        DynamoDb: {
            tableName: 'userData',
        }
    }
};
 