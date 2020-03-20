'use strict';

// ------------------------------------------------------------------
// APP INITIALIZATION
// ------------------------------------------------------------------

const { App } = require('jovo-framework');
const { Alexa } = require('jovo-platform-alexa');
const { GoogleAssistant } = require('jovo-platform-googleassistant');
const { JovoDebugger } = require('jovo-plugin-debugger');
const { FileDb } = require('jovo-db-filedb');
const rp = require('request-promise');
const { DynamoDb } = require('jovo-db-dynamodb');

const app = new App();

app.use(
    new Alexa(),
    new GoogleAssistant(),
    new JovoDebugger(),
    new FileDb(),
    new DynamoDb()
);


// ------------------------------------------------------------------
// APP LOGIC
// ------------------------------------------------------------------

app.setHandler({
    LAUNCH() {
        this.$speech.addText(`Hi! I can give you information on pollution across any city in the world. What city would you like to know about?`)
        this.$reprompt.addText(`What city would you like to know about?`)
        this.ask(this.$speech, this.$reprompt)
        console.debug(`User data: ${this.$user}`)
    },
    
    async NEW_USER() {
        // Check if user is logged into Amazon account, if so, fetch location
        if(this.$request.getAccessToken()) {
            let url = `https://api.amazon.com/user/profile?access_token=${this.$request.getAccessToken()}`;

            await rp(url).then((body) => {
                let data = JSON.parse(body);
                console.log(data)
                // TODO: store user city
                this.$speech(`I see that you're living in {TODO}.`)
                this.followUpState('GetAqiIntent')
                    this.tell(this.$speech)
            });
        } else {
            this.$speech('Hi! I can give you information on pollution across any city in the world. What city do you live in?')
            this.$reprompt(`Sorry, I didn't quite catch that. What city do you live in?`)
            this.followUpState('MyCityIsIntent')
                .ask(this.$speech, this.$reprompt);
        }
    },

    MyCityIsIntent(input) {
        this.$user.$data.location = this.$inputs.location.value;
        this.$speech(`Thanks, I'll remember that you live in ${this.$user.location.value} from now on.`);
        this.followUpState('GetAqiIntent')
            .tell(this.$speech)
    },

    async GetAqiIntent(input) {
        const getAqiCondition = (aqi) => {
            switch (true) {
                case (aqi <= 50):
                    return 'good';
                case (aqi <= 100 ):
                    return 'moderate';
                case (aqi <= 150 ):
                    return 'unhealthy for sensitive groups';
                case (aqi <= 200 ):
                    return 'unhealthy';
                case (aqi <= 300 ):
                    return 'very unhealthy';
                case (aqi <= 500 ):
                    return 'hazardous';
                default:
                    return 'N/A';
            }
        }

        // TODO: add error handling with try/catch
        const url = `https://api.waqi.info/feed/${this.$inputs.location.value}/?token=2bf89bb0ac470ebc6e7874d911227f5af604fdc2`;
        console.log(url)
        await rp(url).then((body) => {
            let response = JSON.parse(body);
            if(response.status != 'error') {
                const aqi = response.data.aqi;
                const indexScale = getAqiCondition(aqi);
                const speakOutput = `The Air Quality Index rating in ${this.$inputs.location.value} is currently ${indexScale} at ${aqi}`;

                // Retrieve document and data from folder
                this.$alexaSkill.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require(`./apl/aqi-template/document.json`),
                    datasources: getDataSource(this.$inputs.location.value, indexScale, aqi)
                });
                this.tell(speakOutput);

            } else {
                this.tell(`Sorry, I can't find any data for that location!`);
            }
        });
    },

});

// APL Data source
let getDataSource = (location, indexScale, aqi) => {
    let dataSource = {
        "bodyTemplate6Data": {
            "type": "object",
            "objectId": "bt6Sample",
            "backgroundImage": {
                "contentDescription": null,
                "smallSourceUrl": null,
                "largeSourceUrl": null,
                "sources": [
                    {
                        "url": "https://d2o906d8ln7ui1.cloudfront.net/images/BT6_Background.png",
                        "size": "small",
                        "widthPixels": 0,
                        "heightPixels": 0
                    },
                    {
                        "url": "https://d2o906d8ln7ui1.cloudfront.net/images/BT6_Background.png",
                        "size": "large",
                        "widthPixels": 0,
                        "heightPixels": 0
                    }
                ]
            },
            "image": {
                "contentDescription": null,
                "smallSourceUrl": null,
                "largeSourceUrl": null,
                "sources": [
                    {
                        "url": "http://images.media-allrecipes.com/userphotos/250x250/303241.jpg",
                        "size": "small",
                        "widthPixels": 0,
                        "heightPixels": 0
                    },
                    {
                        "url": "http://images.media-allrecipes.com/userphotos/250x250/303241.jpg",
                        "size": "large",
                        "widthPixels": 0,
                        "heightPixels": 0
                    }
                ]
            },
            "textContent": {
                "primaryText": {
                    "type": "PlainText",
                    "text": `Air quality in ${location} is ${indexScale} at ${aqi}`
                }
            },
            "logoUrl": "https://d2o906d8ln7ui1.cloudfront.net/images/cheeseskillicon.png",
            "hintText": ""
        }
    }
    return dataSource;
}

module.exports.app = app;


// MyCityIsIntent model
// {
//     "name": "MyCityIsIntent",
//     "phrases": [
//         "Remember that I live in {location}",
//         "I live in {location}",
//         "My area is {location}",
//         "My city is {location}",
//         "My home is in {location}",
//         "My hometown is {location}"
//     ],
//     "inputs": [
//         {
//             "name": "location",
//             "type": {
//                 "alexa": "AMAZON.City",
//                 "dialogflow": "@sys.geo-city" 
//             }
//         }
//     ]
// },
