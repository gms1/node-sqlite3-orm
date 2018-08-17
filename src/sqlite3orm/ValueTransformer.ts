
export interface ValueTransformer {
  /*
   * serialize property value to DB
   */
  toDB(input: any): any;

  /*
   * deserialize property value from DB
   */
  fromDB(input: any): any;
}
