import prisma from "../db";
import KSUID from 'ksuid';
import { generateHashKey } from "../brother/qr";
import { Request, Response } from "express";

/**
 * Returns an array of all ARND samples in the database
 * @param req 
 * @param res 
 */
export async function getARNDSamples(req: Request, res: Response) {
    const samples = await prisma.samples.findMany();
    res.status(200).json(samples);
}

/**
 * Retrieves a specific ARND sample from the database
 * @param req params: qr_code_key - the qr_code_key of the sample to be returned
 * @param res Contains the sample with the specified qr_code_key
 * @returns
 * * 200 - The sample with the specified qr_code_key
 * * 204 - The sample with the specified qr_code_key was not found
 * * 500 - An error occurred while retrieving the sample 
 */
export async function getARNDSample(req: Request, res: Response) {
    const { qr_code_key } = req.params
    try {
        const sample = await prisma.samples.findUnique({
            where: {
                qr_code_key
            }
        });

        // If the sample didnt exist, respond with a 404 (Not Found) and return from the function
        if (sample === null)
            return res.status(404).json({ message: `Sample with qr_code_key ${qr_code_key} not found` })

        res.status(200).json(sample);
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

/**
 * Creates a new ARND sample based on the given information
 * @param req The body should contain the sample information
 * @param res The newly created sample
 * @returns
 * * 201 - The sample was successfully created
 * * 500 - An error occurred while creating the sample
 */
export async function createARNDSample(req: Request, res: Response) {
    const sample: ARNDSample = req.body;

    try {
        const ksuid = await KSUID.random();

        // If the sample doesnt have a qr_code_key, generate one.
        // This is currently done in the client but may be removed in the future.
        // This is done here to ensure that the qr_code_key is always generated
        if (sample.qr_code_key === undefined)
            sample.qr_code_key = generateHashKey(sample);

        const newSample = await prisma.samples.create({
            data: {
                ...sample,
                audit_number: ksuid.timestamp
            }
        })

        res.status(201).json(newSample)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

/**
 * Takes in sample information, generates the new qr_code_key, and adds it to the database.
 * * Note: This function does not actually use the update operation. It creates a new sample in the databse with the new information and returns it.
 * * This is required by merck for compliance reasons. 
 * * The audit_id of updated samples is retained, but the audit_number is changed to the current KSUID timestamp.
 * * This means that the audit_id is unique, but the audit_number is not and all samples with the same audit_id are different versions of the same sample.
 * @param req The body should contain the new sample information
 * @param res The newly created sample 
 */
export async function updateARNDSample(req: Request, res: Response) {
    const newSample: ARNDSample = req.body;

    try {
        var unhashedNewSample: UnhashedARNDSample | {} = {};

        for (const key in newSample) {
            if (key !== 'qr_code_key')
                // @ts-ignore
                unhashedNewSample[key] = newSample[key];
        }

        const ksuid = await KSUID.random();

        // Generate a new qr_code_key based off of the contents of the new sample
        // We have to do this because the payload in req.body contains the old qr_code_key
        const newQR = generateHashKey(unhashedNewSample as UnhashedPSCSSample);
        newSample.qr_code_key = newQR;

        const sample = await prisma.samples.create({
            data: { ...newSample, audit_id: newSample.audit_id, audit_number: ksuid.timestamp }
        })

        res.status(200).json(sample);
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}
