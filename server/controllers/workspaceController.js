import prisma from "../configs/prisma.js"


// Get all workspaces for user
export const getUserWorkspaces = async (req, res) => {
    try {
        // prevent caching of user-specific workspace lists so clients always receive fresh data
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Surrogate-Control', 'no-store');

        const { userId } = await req.auth()
        console.log(`[getUserWorkspaces] request from userId=${userId} ${req.method} ${req.originalUrl}`)

        const workspaces = await prisma.workspace.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId: userId } } }
                ]
            },
            include: {
                members: { include: { user: true } },
                projects: {
                    include: {
                        tasks: { include: { assignee: true, comments: { include: { user: true } } } },
                        members: { include: { user: true } }
                    }
                },
                owner: true
            }
        })

        console.log(`[getUserWorkspaces] returning ${workspaces.length} workspaces for userId=${userId}`)
        if (workspaces.length > 0) console.log(`[getUserWorkspaces] sample workspace ids: ${workspaces.slice(0,3).map(w=>w.id).join(',')}`)

        res.json({ workspaces })

    } catch (error) {
        console.error('[getUserWorkspaces] error:', error)
        res.status(500).json({ message: error.code || error.message })
    }
}

// Add member to workspace
export const addMember = async (req, res) => {
    try {
        const { userId } = await req.auth()
        const { email, role, workspaceId, message } = req.body

        console.log(`[addMember] request from userId=${userId} to add email=${email} to workspace=${workspaceId} as role=${role}`)

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
            console.log(`[addMember] user with email=${email} not found`)
            return res.status(404).json({ message: "User not found" })
        }

        if (!workspaceId || !role) {
            return res.status(400).json({ message: "Missing required parameters" })
        }

        if (!["ADMIN", "MEMBER"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" })
        }

        // fetch workspace
        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, include: { members: true } })

        if (!workspace) {
            console.log(`[addMember] workspace ${workspaceId} not found`)
            return res.status(404).json({ message: "Workspace not found" })
        }

        // check creator has admin role
        if (!workspace.members.find((member) => member.userId === userId && member.role === "ADMIN")) {
            return res.status(401).json({ message: "You donot have admin previledges" })
        }

        // check if target user is already a member
        const existingMember = workspace.members.find((member) => member.userId === user.id)

        if (existingMember) {
            return res.status(400).json({ message: "User is already a member" })
        }

        console.log(`[addMember] adding user=${user.id} to workspace=${workspaceId} as role=${role}`)
        const member = await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId,
                role,
                message
            },
            include: { user: true }
        })

        console.log(`[addMember] created workspaceMember id=${member.id} for user=${user.id}`)

        res.json({ member, message: "Member added successfully" })

    } catch (error) {
        console.error('[addMember] error:', error)
        res.status(500).json({ message: error.code || error.message })
    }
}


