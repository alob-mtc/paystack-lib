/* eslint-disable @typescript-eslint/no-explicit-any */
import fetch from 'node-fetch';
import crypto from 'crypto';
import { HttpStatusCode } from '../../constants/constants';
import { BaseResponse, makeResponse } from '../../contracts/v1/responses/baseResponse';

type Method = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';

export interface IBodyReqPaystackInitTransact {
   email: string;
   amount: number;
   metadata: IPaymentMetaData;
}

export type IPaymentMetaData = {
   display_name: string;
   variable_name: string;
   value: string;
}[];

type IRequestPayload = {
   url: string;
   method: Method;
   data?: unknown;
};

export interface ITransfers {
   amount: string;
   recipient: string;
   reference?: string;
}

export interface ISubscription {
   subscription_code: string;
   email_token: string;
   plan_code: string;
}

export interface IPaystackWebHookRes {
   status: 'success' | 'failed' | 'active' | 'complete' | 'reversed';
   reference: string;
   amount: number;
   channel: 'card' | '';
   subscription_code: string;
   currency: 'NGN';
   fees: number;
   customer_code: string;
   customer: {
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
   };
   authorization: any;
   plan: {
      name: string;
      plan_code: string;
      description: string;
      amount: number;
      interval: 'monthly';
      send_invoices: boolean;
      send_sms: boolean;
      currency: 'NGN';
   };
}

export interface IPaystackNUBANRes {
   bank: {
      name: string;
      id: number;
      slug: string;
   };
   account_name: string; // 'KAROKART / RHODA CHURCH';
   account_number: string;
   assigned: boolean;
   currency: string; // 'NGN';
   metadata: any;
   active: boolean;
   id: number;
   created_at: string; // '2019-12-12T12:39:04.000Z';
   updated_at: string; // '2020-01-06T15:51:24.000Z';
   assignment: {
      integration: number;
      assignee_id: number;
      assignee_type: string; // 'Customer';
      expired: boolean;
      account_type: string; // 'PAY-WITH-TRANSFER-RECURRING';
      assigned_at: string; // '2020-01-06T15:51:24.764Z';
   };
   customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      risk_action: string; // 'default';
   };
}

export interface IPaystackCustomerValidationReq {
   customer_code: string;
   bvn: string;
   first_name: string;
   last_name: string;
}

export interface IPaystackCustomerReq {
   email: string;
   first_name: string;
   last_name: string;
   phone: string;
   metadata: any;
}
export interface IPaystackCustomerRes {
   email: string;
   integration: number;
   domain: string; // 'test';
   customer_code: string;
   id: number;
   identified: boolean;
   identifications: any;
   createdAt: string; // '2016-03-29T20:03:09.584Z';
   updatedAt: string; // '2016-03-29T20:03:09.584Z';
}

export interface IPaystackCustomerValidationRes {
   status: boolean;
   message: string;
}

export interface IPaystackAccountNumberRes {
   account_number: string;
   account_name: string;
   bank_id: number;
}

export class Paystack {
   /**
    * verifywebhook
    */
   public verifywebhook(paystack_signature: string, body: any): boolean {
      const secret = process.env.PAYSTACK_WEBHOOK_SECRET_KEY;
      const hash = crypto
         .createHmac('sha512', secret)
         .update(JSON.stringify(body))
         .digest('hex');
      return hash === paystack_signature;
   }
   /**
    * @method makeRequestAsync
    * @desc Feature will initialize paystack transaction
    * @param {object} req Request object
    * @param {object} res Response object
    * @returns {object} Json data
    */
   private makeRequestAsync = async (payload: IRequestPayload): Promise<any> => {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      return fetch(`${process.env.PAYSTACK_URL}${payload.url}`, {
         method: payload.method,
         headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secret}`,
         },
         body: payload.data && JSON.stringify(payload.data),
      });
   };

   /**
    * @method createCustomerAsynce
    * @desc Feature will create Dedicated NUBAN for a customer
    * @param {object} req Request object
    * @param {object} res Response object
    * @returns {object} Json data
    */
   createCustomerAsynce = async (Customer: IPaystackCustomerReq): Promise<BaseResponse<IPaystackCustomerRes>> => {
      try {
         const apiResponse = await this.makeRequestAsync({
            method: 'POST',
            url: '/dedicated_account',
            data: Customer,
         });
         const res = await apiResponse.json();

         if (!apiResponse.ok) return makeResponse(null, HttpStatusCode.BAD_REQUEST, res.message);

         if (res.errors) return makeResponse(null, HttpStatusCode.INTERNAL_ERROR, `Upstream Error: ${JSON.stringify(res.errors)}`);

         return makeResponse(res.data);
      } catch (error) {
         return makeResponse(null, HttpStatusCode.INTERNAL_ERROR, error.message);
      }
   };

   /**
    * @method getCustomerAsynce
    * @desc Feature will create Dedicated NUBAN for a customer
    * @param {object} req Request object
    * @param {object} res Response object
    * @returns {object} Json data
    */
   getCustomerAsynce = async (customer_code: string): Promise<BaseResponse<IPaystackCustomerRes>> => {
      try {
         const apiResponse = await this.makeRequestAsync({
            method: 'GET',
            url: `/customer/${customer_code}`,
         });
         const res = await apiResponse.json();

         if (!apiResponse.ok) return makeResponse(null, HttpStatusCode.BAD_REQUEST, res.message);

         if (res.errors) return makeResponse(null, HttpStatusCode.INTERNAL_ERROR, `Upstream Error: ${JSON.stringify(res.errors)}`);

         return makeResponse(res.data);
      } catch (error) {
         return makeResponse(null, HttpStatusCode.INTERNAL_ERROR, error.message);
      }
   };

   /**
    * @method validateCustomerAsynce
    * @desc Feature will validate the customer Identify with BVN
    * @param {object} req Request object
    * @param {object} res Response object
    * @returns {object} Json data
    */
   validateCustomerAsynce = async (Customer: IPaystackCustomerValidationReq): Promise<BaseResponse<IPaystackCustomerValidationRes>> => {
      try {
         const apiResponse = await this.makeRequestAsync({
            method: 'POST',
            url: `/customer/${Customer.customer_code}/identification`,
            data: {
               country: 'NG',
               type: 'bvn',
               value: Customer.bvn,
               first_name: Customer.first_name,
               last_name: Customer.last_name,
            },
         });
         const res = await apiResponse.json();

         if (!apiResponse.ok) return makeResponse(null, HttpStatusCode.BAD_REQUEST, res.message);

         if (res.errors) return makeResponse(null, HttpStatusCode.INTERNAL_ERROR, `Upstream Error: ${JSON.stringify(res.errors)}`);

         return makeResponse(res.data);
      } catch (error) {
         return makeResponse(null, HttpStatusCode.INTERNAL_ERROR, error.message);
      }
   };
}

export const PaystackGateWay = new Paystack();
