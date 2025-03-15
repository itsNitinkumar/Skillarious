import {Request,Response} from 'express';
import {db} from '../db/index.ts';
import{coursesTable, educatorsTable, categoryTable, transactionsTable} from '../db/schema.ts';
import { eq,or,sql, and } from 'drizzle-orm';

// 1) Controller to create a course
export const createCourse = async (req: Request, res: Response): Promise<Response> => {
 try{
    const {name,description,about,educatorId,price} = req.body;
    if(!name || !description || !educatorId || !price || about === undefined){
        return res.status(400).json({
            success: false,
            message: 'Required fields are missing'
        });
    }
    // insert into database
    const newCourse = await db.insert(coursesTable).values({
        name,
        description,
        about,
        educatorId,
        price: price.toString(), // Store as string
        comments: "",
        start: new Date(),
        end: new Date(),
        thumbnail: "",
    }).returning();
    ;
    //ensure newcourse is valid
    if(!newCourse || !newCourse[0].id){
        return res.status(500).json({
            success: false,
            message: "Failed to create course",
        });
    }return res.status(201).json({
        success: true,
        message: "Course created successfully",
        courseId: newCourse[0].id,
    });
 }catch (error) {
    console.error('Error creating course:', error);
    return res.status(500).json({ 
        success: false,
        message: 'Error in creating course' });
  }
};

// 2) controller for updating the course

export const updateCourse = async(req: Request, res:Response):Promise<Response> => {
    try {
        const {id} = req.params;
        const {name, description, about, price} = req.body;
        
        // First check if course exists
        const course = await db.select().from(coursesTable).where(eq(coursesTable.id,id));
        if(!course.length){
            return res.status(404).json({ 
                success: false,
                message: 'Course not found' 
            });
        }

        // Create an update object with only defined values
        const updateData: Record<string, any> = {};
        
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (about !== undefined) updateData.about = about;
        if (price !== undefined) updateData.price = price.toString();

        // Only perform update if there are fields to update
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        // Update the course with only defined fields
        const updatedCourse = await db.update(coursesTable)
            .set(updateData)
            .where(eq(coursesTable.id, id))
            .returning();

        return res.status(200).json({
            success: true,  // Fixed typo in 'success'
            message: 'Course updated successfully',
            course: updatedCourse[0],
        });
    
    } catch (error) {
        console.error('Error updating course:', error);
        return res.status(500).json({
            success: false, 
            message: 'Error in updating course' 
        });
    }
};
  // 3)  controller for deleting the course
 export const deleteCourse = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params; // Course ID from URL
  
    if (!id) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    // Check if course exists
    const course = await db.select().from(coursesTable).where(eq(coursesTable.id, id));

    if (!course.length) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Delete course
    await db.delete(coursesTable).where(eq(coursesTable.id, id));

    return res.status(200).json({ 
        success:true,
        message: 'Course deleted successfully' });

  } catch (error) {
    console.error('Error deleting course:', error);
    return res.status(500).json({
        success: false,
         message: 'Error deleting course' });
  }
};

// 4) controller for GetAll courses

export const getAllCourses = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Fetch all courses with educator details
      const courses = await db
        .select({
          id: coursesTable.id,
          name: coursesTable.name,
          description: coursesTable.description,
          about: coursesTable.about,
          rating: coursesTable.thumbnail,
          price: coursesTable.price,
          educatorId: coursesTable.educatorId,
          educatorName: educatorsTable.id, // Fetching educator id for now (Can join to get name if needed)
        })
        .from(coursesTable)
        .leftJoin(educatorsTable, eq(coursesTable.educatorId, educatorsTable.id));
  
      return res.status(200).json({
        success: true,
        message: 'Courses fetched successfully',
        courses,
      });
  
    } catch (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Error fetching courses' });
    }
  };

  // controller for getting a single course
  export const getSingleCourse = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
  
      // Fetch course details
      const course = await db
        .select({
          id: coursesTable.id,
          name: coursesTable.name,
          description: coursesTable.description,
          about: coursesTable.about,
          rating: coursesTable.thumbnail,
          price: coursesTable.price,
          educatorId: coursesTable.educatorId,
          educatorName: educatorsTable.id, // Fetching educator id for now (Can join to get name if needed)
        })
        .from(coursesTable)
        .leftJoin(educatorsTable, eq(coursesTable.educatorId, educatorsTable.id))
        .where(eq(coursesTable.id, id));
  
      if (!course.length) {
        return res.status(404).json({ message: 'Course not found' });
      }
  
      return res.status(200).json({
        message: 'Course fetched successfully',
        course: course[0],
      });
  
    } catch (error) {
      console.error('Error fetching course:', error);
      return res.status(500).json({ message: 'Error fetching course' });
    }
  };

  // 5) controller for search course

  export const searchCourses = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { query } = req.query;
  
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Invalid search query' });
      }
  
      // Using SQL raw query for searching (ILIKE for case-insensitive search)
      const courses = await db
        .select()
        .from(coursesTable)
        .where(
          or(
            sql`${coursesTable.name} ILIKE ${'%' + query + '%'}`,
            sql`${coursesTable.description} ILIKE ${'%' + query + '%'}`,
            sql`${coursesTable.about} ILIKE ${'%' + query + '%'}`
          )
        );
  
      return res.status(200).json({
        message: 'Courses searched successfully',
        courses,
      });
  
    } catch (error) {
      console.error('Error searching courses:', error);
      return res.status(500).json({ message: 'Error searching courses' });
    }
  };
// 6) controller for get courses by category

export const getCoursesByCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { category } = req.params;

    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }

    const courses = await db
      .select({
        id: coursesTable.id,
        name: coursesTable.name,
        description: coursesTable.description,
        about: coursesTable.about,
        price: coursesTable.price,
        thumbnail: coursesTable.thumbnail,
        educatorId: coursesTable.educatorId
      })
      .from(coursesTable)
      .innerJoin(
        categoryTable,
        eq(categoryTable.courseId, coursesTable.id)
      )
      .where(eq(categoryTable.name, category));

    return res.status(200).json({
      message: 'Courses fetched successfully',
      courses,
    });

  } catch (error) {
    console.error('Error fetching courses by category:', error);
    return res.status(500).json({ message: 'Error fetching courses' });
  }
};
// 7)  controller for specific educator

export const getCoursesByEducator = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {id} =req.params as {id: string} ;
    
    if (!id) {
      return res.status(400).json({ message: 'Educator ID is required' });
    }

    const courses = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.educatorId, id));

    return res.status(200).json({
      message: 'Courses fetched successfully',
      courses,
    });

  } catch (error) {
    console.error('Error in fetching courses by educator:', error);
    return res.status(500).json({ message: 'Error fetching courses' });
  }
};

// Example function to check enrollment
const isUserEnrolled = async (userId: string, courseId: string) => {
    const transaction = await db
        .select()
        .from(transactionsTable)
        .where(
            and(
                eq(transactionsTable.userId, userId),
                eq(transactionsTable.courseId, courseId),
                eq(transactionsTable.status, 'completed')
            )
        )
        .limit(1);
    
    return transaction.length > 0;
};

  
