import { UserStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { hashPassword, verifyPassword } from '../utils/password'
import { generateSessionToken, hashSessionToken } from '../utils/sessionToken'
import { deleteDraft as deleteDraftForOwner } from './draftService'
import { deleteSite } from './siteService'

type AdminCreateUserInput = {
  name: string
  email: string
  password: string
  roleName: string
  status?: UserStatus
}

type AdminUpdateUserInput = {
  userId: number
  name?: string
  email?: string
  roleName?: string
  status?: UserStatus
}

type AdminUpdateUserStatusInput = {
  userId: number
  status: UserStatus
}

type AdminResetUserPasswordInput = {
  userId: number
  newPassword: string
  adminUserId: number
}



function sanitizeAdminUser(user: {
  id: number
  email: string
  name: string
  status: UserStatus
  roleId: number
  createdAt: Date
  updatedAt: Date
  role: {
    id: number
    name: string
  }
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    roleId: user.roleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: {
      id: user.role.id,
      name: user.role.name,
    },
  }
}

export async function adminListUsers() {
  const users = await prisma.user.findMany({
    include: {
      role: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return users.map(sanitizeAdminUser)
}

export async function adminCreateUser(input: AdminCreateUserInput) {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  const password = input.password
  const roleName = input.roleName.trim().toLowerCase()
  const status = input.status ?? UserStatus.ACTIVE

  if (!email) {
    throw new Error('Email is required')
  }

  if (!name) {
    throw new Error('Name is required')
  }

  if (!password) {
    throw new Error('Password is required')
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  // Add must have Uppercase letter, number, and special character here 

  if (!roleName) {
    throw new Error('Role name is required')
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new Error('Email already in use')
  }

  const role = await prisma.role.findUnique({
    where: { name: roleName },
  })

  if (!role) {
    throw new Error('Role not found')
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email,
      name,
      roleId: role.id,
      status,
      credential: {
        create: {
          passwordHash,
        },
      },
    },
    include: {
      role: true,
    },
  })

  return sanitizeAdminUser(user)
}

export async function adminUpdateUser(input: AdminUpdateUserInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { role: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  let nextRoleId: number | undefined = undefined

  if (input.roleName !== undefined) {
    const roleName = input.roleName.trim().toLowerCase()

    if (!roleName) {
      throw new Error('Role name is required')
    }

    const role = await prisma.role.findUnique({
      where: { name: roleName },
    })

    if (!role) {
      throw new Error('Role not found')
    }

    nextRoleId = role.id
  }

  let nextEmail: string | undefined = undefined
  if (input.email !== undefined) {
    nextEmail = input.email.trim().toLowerCase()

    if (!nextEmail) {
      throw new Error('Email is required')
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: nextEmail },
    })

    if (existingUser && existingUser.id !== user.id) {
      throw new Error('Email already in use')
    }
  }

  let nextName: string | undefined = undefined
  if (input.name !== undefined) {
    nextName = input.name.trim()

    if (!nextName) {
      throw new Error('Name is required')
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: nextName,
      email: nextEmail,
      roleId: nextRoleId,
      status: input.status,
    },
    include: {
      role: true,
    },
  })

  return sanitizeAdminUser(updatedUser)
}

export async function adminUpdateUserStatus(input: AdminUpdateUserStatusInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { role: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      status: input.status,
    },
    include: {
      role: true,
    },
  })

  return sanitizeAdminUser(updatedUser)
}

export async function adminResetUserPassword(
  input: AdminResetUserPasswordInput
) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: {
      role: true,
      credential: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  if (!user.credential) {
    throw new Error('User credential not found')
  }

  if (!input.newPassword) {
    throw new Error('New password is required')
  }

  if (input.newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  if (user.role.name === 'admin' && input.userId !== input.adminUserId) {
    throw new Error('Admin password reset for another admin is not allowed')
  }

  const passwordHash = await hashPassword(input.newPassword)

  await prisma.userCredential.update({
    where: {
      userId: user.id,
    },
    data: {
      passwordHash,
      passwordUpdatedAt: new Date(),
    },
  })

  return {
    userId: user.id,
    passwordReset: true,
  }
}

export async function adminListDrafts() {
  return prisma.draft.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      defaultSite: {
        select: {
          id: true,
          siteName: true,
          siteUrl: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })
}

export async function adminGetDraftById(draftId: number) {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      defaultSite: true,
      seoMeta: true,
      images: true,
      categories: true,
      tags: true,
      postSyncs: true,
    },
  })

  if (!draft) {
    throw new Error('Draft not found')
  }

  return draft
}


// Delete User here, with draft redirect to another user (preferrably admin)
// or delete them outright


export async function adminDeleteDraft(draftId: number) {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
  })

  if (!draft) {
    throw new Error('Draft not found')
  }

  // Replace this with your shared cleanup delete helper if you extract one.
  await deleteDraftForOwner(draftId, draft.userId)

  return {
    id: draftId,
    deleted: true,
  }
}

export async function adminListSites() {
  return prisma.wpSite.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function adminGetSiteById(siteId: number) {
  const site = await prisma.wpSite.findUnique({
    where: { id: siteId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })

  if (!site) {
    throw new Error('Site not found')
  }

  return site
}

export async function adminDeleteSite(siteId: number) {
  const site = await prisma.wpSite.findUnique({
    where: { id: siteId },
  })

  if (!site) {
    throw new Error('Site not found')
  }

  await deleteSite(siteId, site.userId)

  return {
    id: siteId,
    deleted: true,
  }
}


