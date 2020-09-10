import { YypAudioGroup } from "../../types/YypComponents";

export class Gms2ProjectAudioGroup {

  #data: YypAudioGroup;

  constructor(option:YypAudioGroup){
    this.#data = {...option};
  }

  get dehydrated(): YypAudioGroup{
    return {...this.#data};
  }
}
