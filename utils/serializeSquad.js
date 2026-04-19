const buildCollectionInsights = require("./buildCollectionInsights");
const serializeOwnedCard = require("./serializeOwnedCard");

function serializeSquad(squad) {
  const startingCards = Array.isArray(squad && squad.startingXI) ? squad.startingXI : [];

  return {
    id: squad ? squad._id : null,
    userId: squad ? squad.userId : null,
    formation: squad ? squad.formation : null,
    overall: squad ? squad.overall : 0,
    playerCount: startingCards.length,
    insights: buildCollectionInsights(startingCards),
    startingXI: startingCards.map((card) => serializeOwnedCard(card))
  };
}

module.exports = serializeSquad;
