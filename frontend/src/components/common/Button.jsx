import { clsx } from 'clsx';

const Button = ({ children, variant = 'primary', className, icon, ...props }) => {
  const variants = {
    primary: 'bg-[#6B8E7B] text-white hover:bg-[#5A7A69] shadow-md',
    secondary: 'bg-[#F5F8FA] text-[#6B8E7B] hover:bg-[#E8F0EB] border border-[#6B8E7B]/10',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    indigo: 'bg-indigo-600 text-white hover:bg-indigo-700',
  };

  return (
    <button
      className={clsx(
        'px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all',
        variants[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="iconify text-xl" data-icon={icon}></span>}
      {children}
    </button>
  );
};

export default Button;
