/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@acme/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@acme/ui/form";
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/use-toast";
import { Profile } from '@/lib/types';
import { updateProfile } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

// Updated schema to include phone number
const profileFormSchema = z.object({
  full_name: z
    .string()
    .min(2, {
      message: "El nombre debe tener al menos 2 caracteres.",
    })
    .max(50, {
      message: "El nombre no debe tener más de 50 caracteres.",
    }),
  email: z.string().email({ message: "Por favor ingrese un correo válido." }),
  phone_number: z.string().optional(), // Make phone number optional
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface UserProfileFormProps {
  profile: Profile;
}

export function UserProfileForm({ profile }: UserProfileFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: profile.full_name || '',
      email: profile.email || '',
      phone_number: profile.phone_number || '' // Set default value
    },
    mode: "onChange",
  });

  async function onSubmit(data: ProfileFormValues) {
    const result = await updateProfile(profile.id, data);
    if (result.success) {
      toast({
        title: "Perfil Actualizado",
        description: "Tu información ha sido actualizada exitosamente.",
      });
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: 'destructive',
      });
    }
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Configuración del Perfil</CardTitle>
            <CardDescription>Aquí puedes actualizar tu información personal.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                        <Input placeholder="Tu nombre" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input placeholder="tu@email.com" {...field} readOnly disabled />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Teléfono (con código de país)</FormLabel>
                      <FormControl>
                        <Input placeholder="+11234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Guardar Cambios</Button>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
