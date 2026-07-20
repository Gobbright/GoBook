import { Router } from 'express';

import { createBranch, deleteBranch, listBranches, updateBranch } from './branchController.js';
import { getSettings, updateSettings, uploadLogo, removeLogo, logoUpload } from './settingsController.js';
import { createUser, deleteUser, listUsers, updateUser } from './userController.js';

export const settingsRouter = Router();

// Business settings
settingsRouter.get('/',           getSettings);
settingsRouter.put('/',           updateSettings);
settingsRouter.post('/logo',      logoUpload.single('logo'), uploadLogo);
settingsRouter.delete('/logo',    removeLogo);

// Branches
settingsRouter.get('/branches',      listBranches);
settingsRouter.post('/branches',     createBranch);
settingsRouter.put('/branches/:id',  updateBranch);
settingsRouter.delete('/branches/:id', deleteBranch);

// Users
settingsRouter.get('/users',      listUsers);
settingsRouter.post('/users',     createUser);
settingsRouter.put('/users/:id',  updateUser);
settingsRouter.delete('/users/:id', deleteUser);
