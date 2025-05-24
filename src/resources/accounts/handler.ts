import { Kit } from "../../index";

export class AccountsHandler {
  #sdk: Kit;

  constructor(sdk: Kit) {
    this.#sdk = sdk;
  }

  public getCurrentAccount() {}

  public listColors() {}

  public updateColors() {}

  public getCreatorProfile() {}

  public getEmailStats() {}

  public getGrowthStats() {}
}
