const assert = require("assert");
const ganache = require("ganache-cli");
const Web3 = require("web3");
const web3 = new Web3(ganache.provider());
const { interface, bytecode } = require("../compile");

let lottery;
let accounts;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode })
    .send({ gas: "1000000", from: accounts[0] });
});

describe("Lottery contract", () => {
  it("contract deployed", () => {
    assert.ok(lottery.options.address);
  });
  it("one account entered lottery", async () => {
    await lottery.methods
      .enter()
      .send({ from: accounts[0], value: web3.utils.toWei("0.02", "ether") });
    const players = await lottery.methods
      .getPlayers()
      .call({ from: accounts[0] });
    assert.equal(accounts[0], players[0]);
    assert.ok(players.length == 1);
  });
  it("many accounts entered lottery", async () => {
    await lottery.methods
      .enter()
      .send({ from: accounts[0], value: web3.utils.toWei("0.02", "ether") });
    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei("0.02", "ether"),
    });
    await lottery.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei("0.02", "ether"),
    });
    const players = await lottery.methods
      .getPlayers()
      .call({ from: accounts[0] });
    assert.equal(accounts[0], players[0]);
    assert.equal(accounts[1], players[1]);
    assert.equal(accounts[2], players[2]);
    assert.ok(players.length == 3);
  });
  it("enough ether was sent by player", async () => {
    try {
      await lottery.methods.enter().send({
        from: accounts[0],
        value: web3.utils.toWei("0.001", "ether"),
      });
      assert(false);
    } catch (err) {
      assert(err); //assert checks for truthiness. assert.okay checks for existence of a value
    }
  });
  it("unauthorized person picked winner", async () => {
    try {
      await lottery.pickWinner().send({
        from: accounts[1],
      });
      assert(false);
    } catch (err) {
      assert(err);
    }
  });
  it("money sent to winner and pool reset", async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei("2", "ether"),
    });
    const initialBalance = await web3.eth.getBalance(accounts[0]);

    await lottery.methods.pickWinner().send({ from: accounts[0] });

    const newBalance = await web3.eth.getBalance(accounts[0]);
    const difference = newBalance - initialBalance;
    assert(difference > web3.utils.toWei("1.8", "ether"));

    const players = await lottery.methods.getPlayers().call();
    assert.equal(0, players.length);

    const contractBalance = await web3.eth.getBalance(lottery.options.address);
    console.log(contractBalance);
    assert.equal(0, contractBalance);
  });
});
