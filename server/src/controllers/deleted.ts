import { deleted } from "@prisma/client";
import prisma from "../db";
import { Request, Response } from "express";

/**
 * TODO:
 * [ ] getDeletedSamples() - get all deleted samples for a team (ARND or PSCS specified in req.params)
 * [ ] getDeletedSample() - based on query params, get a deleted sample
 */

/**
 * 
 * @param req 
 * @param res 
 */
export async function getDeletedSamples(req: Request, res: Response) {
    try {
        const samples = await prisma.deleted.findMany();
        return res.status(200).json(samples);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export async function getDeletedSamplesByTeam(req: Request, res: Response) {
    try {
        const { team } = req.params;

        const deletedQRCodeKeys = (await prisma.deleted.findMany({
            where: {
                team: team as string
            },
            select: {
                qr_code_key: true
            }
        }))
            .map((_) => _.qr_code_key);

        var deletedSamples: (ARNDSample | PSCSSample)[] = [];

        switch (team) {
            case 'ARND':
                deletedSamples = await prisma.samples.findMany({
                    where: {
                        qr_code_key: {
                            in: deletedQRCodeKeys
                        }
                    }
                });
                break;

            case 'PSCS':
                deletedSamples = await prisma.psamples.findMany({
                    where: {
                        qr_code_key: {
                            in: deletedQRCodeKeys
                        }
                    }
                });
                break;
        }

        res.status(200).json(deletedSamples);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export async function createDeleted(req: any, res: any) {
    const deleted: Deleted = req.body;
    try {
        const newDeleted = await prisma.deleted.create({
            data: { ...deleted }
        })
        res.status(201).json(newDeleted)
    } catch (error: any) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}