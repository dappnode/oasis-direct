// Libraries
import * as RpcSource from "web3-provider-engine/dist/es5/subproviders/rpc";
import Transport from "@ledgerhq/hw-transport-u2f";
import Web3 from "web3";
import * as Web3ProviderEngine from "web3-provider-engine/dist/es5";

// Utils
import LedgerSubProvider from "./ledger-subprovider";
import TrezorSubProvider from "./trezor-subprovider";

// Settings
import * as settings from "../settings";

export const getCurrentProviderName = ( provider = window.web3.currentProvider ) => {
  if (!provider)
    return "";

  if (provider.isMetaMask)
    return "metamask";

  if (provider.isTrust)
    return "trust";

  if (window.web3.currentProvider.isStatus)
    return "status";

  if (typeof window.SOFA !== "undefined")
    return "coinbase";

  if (typeof window.__CIPHER__ !== "undefined")
    return "cipher";

  if (provider.constructor.name === "EthereumProvider")
    return "mist";

  if (provider.constructor.name === "Web3FrameProvider")
    return "parity";

  if (provider.host && provider.host.indexOf("infura") !== -1)
    return "infura";

  if (provider.host && provider.host.indexOf("localhost") !== -1)
    return "localhost";

  return "other";
};

class Web3Extended extends Web3 {
  stop = () => {
    this.reset();
    if (this.currentProvider && typeof this.currentProvider.stop === "function") {
      this.currentProvider.stop();
    }
  };

  setHWProvider = (device, network, path, accountsOffset = 0, accountsLength = 1) => {
    this.stop();
    return new Promise(async (resolve, reject) => {
      try {
        const networkId = network === "main" ? 1 : (network === "kovan" ? 42 : "");
        this.setProvider(new Web3ProviderEngine());
        const hwWalletSubProvider = device === "ledger"
          ? LedgerSubProvider(async () => await Transport.create(), {networkId, path, accountsOffset, accountsLength})
          : TrezorSubProvider({networkId, path, accountsOffset, accountsLength});
        this.currentProvider.name = device;
        this.currentProvider.addProvider(hwWalletSubProvider);
        this.currentProvider.addProvider(new RpcSource({rpcUrl: settings.chain[network].nodeURL}));
        this.currentProvider.start();
        this.useLogs = false;
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  };

  bindProvider = provider => {
    console.log(provider);
    this.setProvider(provider);
    this.currentProvider.name = getCurrentProviderName(provider);
  };

  setWebClientProvider = () => {
    this.stop();
    return new Promise(async (resolve, reject) => {
      try {
        if (window.web3) { // This is the case for Provider Injectors which don't follow EIP1102 ( parity-extension ? )
          console.log("Are we here?");
          this.bindProvider(window.web3.currentProvider);
          resolve();
        } else {
          if (window.ethereum) { //following the new EIP1102 standard
            window.ethereum.enable().then(
              () => {
                this.bindProvider(window.ethereum);
                resolve();
              },
              () => {
                alert('No Authorization!');
                reject();
              })
          } else {
            alert('No Provider found!');
            reject();
          }
        }
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }
}

const web3 = new Web3Extended();
web3.BigNumber.config({EXPONENTIAL_AT: [-18, 21]});
window.web3Provider = web3;

export default web3;