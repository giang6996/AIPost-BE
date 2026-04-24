import { Request, Response } from 'express'
import { UserStatus } from '@prisma/client'
import { sendError, sendErrorNormalized, sendSuccess } from '../utils/apiResponse'
import { getParamAsString} from '../utils/paramString'
import { parsePositiveInt} from '../utils/positiveInt'
import {
  adminCreateUser,
  adminDeleteDraft,
  adminDeleteSite,
  adminGetDraftById,
  adminGetSiteById,
  adminListDrafts,
  adminListSites,
  adminListUsers,
  adminResetUserPassword,
  adminUpdateUser,
  adminUpdateUserStatus,
} from '../services/adminService'

export async function adminListUsersHandler(_req: Request, res: Response) {
  try {
    const users = await adminListUsers()
    return sendSuccess(res, users, 'Users fetched successfully')
  } catch (error) {
    return sendErrorNormalized(
      res,
      error,
      {
        message: 'Failed to fetch users',
        code: 'ADMIN_LIST_USERS_FAILED',
        status: 500,
      }
    )
  }
}

export async function adminCreateUserHandler(req: Request, res: Response) {
  try {
    const result = await adminCreateUser({
      name: typeof req.body.name === 'string' ? req.body.name : '',
      email: typeof req.body.email === 'string' ? req.body.email : '',
      password: typeof req.body.password === 'string' ? req.body.password : '',
      roleName: typeof req.body.roleName === 'string' ? req.body.roleName : '',
      status:
        req.body.status && Object.values(UserStatus).includes(req.body.status)
          ? req.body.status
          : UserStatus.ACTIVE,
    })

    return sendSuccess(res, result, 'User created successfully', 201)
  } catch (error) {
    return sendErrorNormalized(
      res,
      error,
      {
        message: 'Failed to create user',
        code: 'ADMIN_CREATE_USER_FAILED',
        status: 500,
      },
      {
        'Email already in use': {
          code: 'ADMIN_CREATE_USER_FAILED',
          status: 409,
        },
        'Role not found': {
          code: 'ADMIN_CREATE_USER_FAILED',
          status: 400,
        },
        'Email is required': {
          code: 'ADMIN_CREATE_USER_FAILED',
          status: 400,
        },
        'Name is required': {
          code: 'ADMIN_CREATE_USER_FAILED',
          status: 400,
        },
        'Password is required': {
          code: 'ADMIN_CREATE_USER_FAILED',
          status: 400,
        },
        'Password must be at least 8 characters': {
          code: 'ADMIN_CREATE_USER_FAILED',
          status: 400,
        },
        'Role name is required': {
          code: 'ADMIN_CREATE_USER_FAILED',
          status: 400,
        },
      }
    )
  }
}

export async function adminUpdateUserHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const userId = idParam ? parsePositiveInt(idParam) : null

    if (!userId) {
      return sendError(
        res,
        'Invalid user id',
        { code: 'INVALID_USER_ID' },
        400
      )
    }

    const result = await adminUpdateUser({
      userId,
      name: typeof req.body.name === 'string' ? req.body.name : undefined,
      email: typeof req.body.email === 'string' ? req.body.email : undefined,
      roleName:
        typeof req.body.roleName === 'string' ? req.body.roleName : undefined,
      status:
        req.body.status && Object.values(UserStatus).includes(req.body.status)
          ? req.body.status
          : undefined,
    })

    return sendSuccess(res, result, 'User updated successfully')
  } catch (error) {
    return sendErrorNormalized(
      res,
      error,
      {
        message: 'Failed to update user',
        code: 'ADMIN_UPDATE_USER_FAILED',
        status: 500,
      },
      {
        'User not found': {
          code: 'ADMIN_UPDATE_USER_FAILED',
          status: 404,
        },
        'Email already in use': {
          code: 'ADMIN_UPDATE_USER_FAILED',
          status: 409,
        },
        'Role not found': {
          code: 'ADMIN_UPDATE_USER_FAILED',
          status: 400,
        },
        'Name is required': {
          code: 'ADMIN_UPDATE_USER_FAILED',
          status: 400,
        },
        'Email is required': {
          code: 'ADMIN_UPDATE_USER_FAILED',
          status: 400,
        },
        'Role name is required': {
          code: 'ADMIN_UPDATE_USER_FAILED',
          status: 400,
        },
      }
    )
  }
}

export async function adminResetUserPasswordHandler(
  req: Request,
  res: Response
) {
  try {
    const idParam = getParamAsString(req.params.id)
    const userId = idParam ? parsePositiveInt(idParam) : null

    if (!userId) {
      return sendError(
        res,
        'Invalid user id',
        { code: 'INVALID_USER_ID' },
        400
      )
    }

    const newPassword =
      typeof req.body.newPassword === 'string' ? req.body.newPassword : ''

    if (!newPassword) {
      return sendError(
        res,
        'New password is required',
        { code: 'VALIDATION_ERROR' },
        400
      )
    }

    const adminUserId = req.authUser!.id

    const result = await adminResetUserPassword({
      userId,
      newPassword,
      adminUserId,
    })

    return sendSuccess(res, result, 'User password reset successfully')
  } catch (error) {
    return sendErrorNormalized(
      res,
      error,
      {
        message: 'Failed to reset password',
        code: 'ADMIN_RESET_PASSWORD_FAILED',
        status: 500,
      },
      {
        'User not found': {
          code: 'ADMIN_RESET_PASSWORD_FAILED',
          status: 404,
        },
        'User credential not found': {
          code: 'ADMIN_RESET_PASSWORD_FAILED',
          status: 404,
        },
        'Admin password reset for another admin is not allowed': {
          code: 'ADMIN_RESET_PASSWORD_FAILED',
          status: 403,
        },
        'New password is required': {
          code: 'ADMIN_RESET_PASSWORD_FAILED',
          status: 400,
        },
        'Password must be at least 8 characters': {
          code: 'ADMIN_RESET_PASSWORD_FAILED',
          status: 400,
        },
      }
    )
  }
}

export async function adminListDraftsHandler(_req: Request, res: Response) {
  try {
    const drafts = await adminListDrafts()
    return sendSuccess(res, drafts, 'Drafts fetched successfully')
  } catch (error) {
    return sendErrorNormalized(
      res,
      error,
      {
        message: 'Failed to fetch drafts',
        code: 'ADMIN_LIST_DRAFTS_FAILED',
        status: 500,
      }
    )
  }
}

export async function adminDeleteDraftHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const draftId = idParam ? parsePositiveInt(idParam) : null

    if (!draftId) {
      return sendError(
        res,
        'Invalid draft id',
        { code: 'INVALID_DRAFT_ID' },
        400
      )
    }

    const result = await adminDeleteDraft(draftId)
    return sendSuccess(res, result, 'Draft deleted successfully')
  } catch (error) {
    return sendErrorNormalized(
      res,
      error,
      {
        message: 'Failed to delete draft',
        code: 'ADMIN_DELETE_DRAFT_FAILED',
        status: 500,
      },
      {
        'Draft not found': {
          code: 'ADMIN_DELETE_DRAFT_FAILED',
          status: 404,
        },
      }
    )
  }
}

export async function adminListSitesHandler(_req: Request, res: Response) {
  try {
    const sites = await adminListSites()
    return sendSuccess(res, sites, 'Sites fetched successfully')
  } catch (error) {
    return sendErrorNormalized(
      res,
      error,
      {
        message: 'Failed to fetch sites',
        code: 'ADMIN_LIST_SITES_FAILED',
        status: 500,
      }
    )
  }
}

export async function adminGetSiteHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const siteId = idParam ? parsePositiveInt(idParam) : null

    if (!siteId) {
      return sendError(
        res,
        'Invalid site id',
        { code: 'INVALID_SITE_ID' },
        400
      )
    }

    const site = await adminGetSiteById(siteId)
    return sendSuccess(res, site, 'Site fetched successfully')
  } catch (error) {
    return sendErrorNormalized(
      res,
      error,
      {
        message: 'Failed to fetch site',
        code: 'ADMIN_GET_SITE_FAILED',
        status: 500,
      },
      {
        'Site not found': {
          code: 'ADMIN_GET_SITE_FAILED',
          status: 404,
        },
      }
    )
  }
}

export async function adminDeleteSiteHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const siteId = idParam ? parsePositiveInt(idParam) : null

    if (!siteId) {
      return sendError(
        res,
        'Invalid site id',
        { code: 'INVALID_SITE_ID' },
        400
      )
    }

    const result = await adminDeleteSite(siteId)
    return sendSuccess(res, result, 'Site deleted successfully')
  } catch (error) {
    return sendErrorNormalized(
      res,
      error,
      {
        message: 'Failed to delete site',
        code: 'ADMIN_DELETE_SITE_FAILED',
        status: 500,
      },
      {
        'Site not found': {
          code: 'ADMIN_DELETE_SITE_FAILED',
          status: 404,
        },
      }
    )
  }
}

export async function adminUpdateUserStatusHandler(
  req: Request,
  res: Response
) {
  try {
    const idParam = getParamAsString(req.params.id)
    const userId = idParam ? parsePositiveInt(idParam) : null

    if (!userId) {
      return sendError(
        res,
        'Invalid user id',
        { code: 'INVALID_USER_ID' },
        400
      )
    }

    const status =
      req.body.status && Object.values(UserStatus).includes(req.body.status)
        ? req.body.status
        : null

    if (!status) {
      return sendError(
        res,
        'Invalid status',
        { code: 'INVALID_STATUS' },
        400
      )
    }

    const result = await adminUpdateUserStatus({
      userId,
      status,
    })

    return sendSuccess(res, result, 'User status updated successfully')
  } catch (error) {
    return sendErrorNormalized(
      res,
      error,
      {
        message: 'Failed to update user status',
        code: 'ADMIN_UPDATE_USER_STATUS_FAILED',
        status: 500,
      },
      {
        'User not found': {
          code: 'ADMIN_UPDATE_USER_STATUS_FAILED',
          status: 404,
        },
      }
    )
  }
}

export async function adminGetDraftHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const draftId = idParam ? parsePositiveInt(idParam) : null

    if (!draftId) {
      return sendError(
        res,
        'Invalid draft id',
        { code: 'INVALID_DRAFT_ID' },
        400
      )
    }

    const draft = await adminGetDraftById(draftId)
    return sendSuccess(res, draft, 'Draft fetched successfully')
  } catch (error) {
    return sendErrorNormalized(
      res,
      error,
      {
        message: 'Failed to fetch draft',
        code: 'ADMIN_GET_DRAFT_FAILED',
        status: 500,
      },
      {
        'Draft not found': {
          code: 'ADMIN_GET_DRAFT_FAILED',
          status: 404,
        },
      }
    )
  }
}
